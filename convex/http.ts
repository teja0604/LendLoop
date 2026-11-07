import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { verifyWebhookSignature } from "./webhookSecurity";

const http = httpRouter();

const ALLOWED_ACTIVITY_EVENT_TYPES = new Set([
  "borrow_request.created",
  "borrow_request.approved",
  "borrow_request.declined",
  "loan.created",
  "loan.returned",
  "loan.overdue",
]);

/**
 * SECURE INBOUND WEBHOOK ENDPOINT
 * Allows authenticated n8n workflows to write back notification execution outcomes
 * into the `automationActivity` table.
 *
 * Security & Integrity:
 * 1. Requires valid HMAC-SHA256 signature in X-LendLoop-Signature
 * 2. Requires fresh timestamp in X-LendLoop-Timestamp (within 5 minutes)
 * 3. Constant-time signature verification
 * 4. Validates event types against strict allowlist
 * 5. Validates all document IDs and relationships against real database entities
 * 6. Enforces length and format constraints on keys and summaries
 * 7. Guarantees idempotency and safe retry updating via `recordActivityInternal`
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

    // 1. Verify HMAC-SHA256 signature and timestamp tolerance
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

    // 2. Parse and validate JSON payload
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

    // 3. Validate idempotencyKey
    if (
      !idempotencyKey ||
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length < 5 ||
      idempotencyKey.length > 256
    ) {
      return new Response(
        JSON.stringify({
          error: "Bad Request: 'idempotencyKey' must be a non-empty string between 5 and 256 characters.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Validate eventType against allowlist
    if (!eventType || typeof eventType !== "string" || !ALLOWED_ACTIVITY_EVENT_TYPES.has(eventType)) {
      return new Response(
        JSON.stringify({
          error: `Bad Request: Invalid or unsupported eventType '${eventType}'. Allowed types: ${Array.from(ALLOWED_ACTIVITY_EVENT_TYPES).join(", ")}.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Validate result
    if (result !== "sent" && result !== "failed") {
      return new Response(
        JSON.stringify({ error: "Bad Request: 'result' must be either 'sent' or 'failed'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Validate summary
    if (
      !summary ||
      typeof summary !== "string" ||
      summary.trim().length === 0 ||
      summary.length > 1000
    ) {
      return new Response(
        JSON.stringify({
          error: "Bad Request: 'summary' must be a non-empty string under 1000 characters.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const typedRequestId = requestId ? (requestId as Id<"borrowRequests">) : undefined;
    const typedLoanId = loanId ? (loanId as Id<"loans">) : undefined;
    const typedRecipientId = recipientUserId ? (recipientUserId as Id<"users">) : undefined;

    // 7. Validate entity references and structural relationships in database
    const validation = await ctx.runQuery(internal.outbox.validateActivityEntities, {
      requestId: typedRequestId,
      loanId: typedLoanId,
      recipientUserId: typedRecipientId,
      eventType,
    });

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: `Bad Request: ${validation.error}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 8. Write back outcome to automationActivity idempotently
    const recordResult = await ctx.runMutation(
      internal.outbox.recordActivityInternal,
      {
        idempotencyKey: idempotencyKey.trim(),
        requestId: typedRequestId,
        loanId: typedLoanId,
        eventType,
        recipientUserId: typedRecipientId,
        result,
        summary: summary.trim(),
      }
    );

    return new Response(JSON.stringify(recordResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
