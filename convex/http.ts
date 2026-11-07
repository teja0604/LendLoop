import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { verifyWebhookSignature } from "./webhookSecurity";

const http = httpRouter();

/**
 * SECURE INBOUND WEBHOOK ENDPOINT
 * Allows authenticated n8n workflows to write back notification execution outcomes
 * into the `automationActivity` table.
 *
 * Security & Integrity:
 * 1. Requires valid HMAC-SHA256 signature in X-LendLoop-Signature
 * 2. Requires fresh timestamp in X-LendLoop-Timestamp (within 5 minutes)
 * 3. Constant-time signature verification
 * 4. Rejects malformed bodies or unapproved result codes
 * 5. Guarantees idempotency via `automationActivity.idempotencyKey`
 */
http.route({
  path: "/api/webhooks/n8n/activity",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-lendloop-signature");
    const timestampHeader = request.headers.get("x-lendloop-timestamp");
    const secret = process.env.N8N_WEBHOOK_HMAC_SECRET;

    if (!secret) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error: N8N_WEBHOOK_HMAC_SECRET is not configured.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify HMAC-SHA256 signature and timestamp tolerance
    const verification = await verifyWebhookSignature({
      payload: rawBody,
      signatureHeader,
      timestampHeader,
      secret,
    });

    if (!verification.isValid) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Invalid HMAC signature or timestamp expired.",
          details: verification.error,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate JSON payload
    let body: {
      idempotencyKey?: unknown;
      requestId?: unknown;
      loanId?: unknown;
      eventType?: unknown;
      recipientUserId?: unknown;
      result?: unknown;
      summary?: unknown;
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Bad Request: Malformed JSON body." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const {
      idempotencyKey,
      requestId,
      loanId,
      eventType,
      recipientUserId,
      result,
      summary,
    } = body;

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return new Response(
        JSON.stringify({ error: "Bad Request: Missing or invalid 'idempotencyKey'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!eventType || typeof eventType !== "string") {
      return new Response(
        JSON.stringify({ error: "Bad Request: Missing or invalid 'eventType'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (result !== "sent" && result !== "failed") {
      return new Response(
        JSON.stringify({ error: "Bad Request: 'result' must be 'sent' or 'failed'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!summary || typeof summary !== "string") {
      return new Response(
        JSON.stringify({ error: "Bad Request: Missing or invalid 'summary'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Write back outcome to automationActivity idempotently
    const recordResult = await ctx.runMutation(
      internal.outbox.recordActivityInternal,
      {
        idempotencyKey: idempotencyKey as string,
        requestId: (requestId ? (requestId as Id<"borrowRequests">) : undefined),
        loanId: (loanId ? (loanId as Id<"loans">) : undefined),
        eventType: eventType as string,
        recipientUserId: (recipientUserId ? (recipientUserId as Id<"users">) : undefined),
        result: result as "sent" | "failed",
        summary: summary as string,
      }
    );

    return new Response(JSON.stringify(recordResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
