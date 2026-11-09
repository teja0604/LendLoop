import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { generateWebhookSignature } from "./webhookSecurity";
import { isOverdue, getTodayUtcDateString } from "./dateUtils";
import { outboxEventTypeValidator } from "./schema";

export const MAX_RETRY_ATTEMPTS = 5;
export const STALE_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Event-to-n8n-webhook endpoint route mappings.
 * All supported platform events are routed to explicit, active workflows.
 */
export const EVENT_ROUTE_PATHS: Record<string, string> = {
  "borrow_request.created": "lendloop-request-created",
  "request.created": "lendloop-request-created",
  "borrow_request.approved": "lendloop-request-decision",
  "request.approved": "lendloop-request-decision",
  "borrow_request.declined": "lendloop-request-decision",
  "request.declined": "lendloop-request-decision",
  "loan.returned": "lendloop-loan-returned",
  "loan.overdue": "lendloop-overdue-reminder",
};

/**
 * Resolves the destination webhook URL for an event type.
 * Handles base URLs and direct path overrides. Rejects unsupported event types.
 */
export function resolveWebhookUrl(eventType: string, baseOrOverrideUrl?: string | null): string | null {
  if (!baseOrOverrideUrl) return null;

  const path = EVENT_ROUTE_PATHS[eventType];
  if (!path) return null; // Unsupported event type

  const trimmed = baseOrOverrideUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith(`/${path}`) || trimmed.endsWith(path)) {
    return trimmed;
  }
  const baseWithWebhook = trimmed.endsWith("/webhook") ? trimmed : `${trimmed}/webhook`;
  return `${baseWithWebhook}/${path}`;
}

/**
 * INTERNAL MUTATION: Record Automation Activity (Idempotent with Retry Updating)
 * Ensures duplicate webhook deliveries do not create duplicate activity records,
 * while allowing a previously failed attempt to be cleanly updated when a later retry succeeds.
 */
export const recordActivityInternal = internalMutation({
  args: {
    idempotencyKey: v.string(),
    requestId: v.optional(v.id("borrowRequests")),
    loanId: v.optional(v.id("loans")),
    eventType: v.string(),
    recipientUserId: v.optional(v.id("users")),
    result: v.union(v.literal("sent"), v.literal("failed")),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Enforce idempotency check via index 'by_idempotency_key'
    const existing = await ctx.db
      .query("automationActivity")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();

    if (existing !== null) {
      // If previous attempt failed and subsequent retry succeeds:
      // Update the existing record to reflect final successful outcome.
      if (existing.result === "failed" && args.result === "sent") {
        await ctx.db.patch(existing._id, {
          result: "sent",
          summary: args.summary,
          updatedAt: Date.now(),
        });
        return {
          success: true,
          activityId: existing._id,
          duplicate: false,
          updated: true,
        };
      }

      // If previous attempt was already "sent", do not overwrite with late failure or duplicate success
      return {
        success: true,
        activityId: existing._id,
        duplicate: true,
      };
    }

    const now = Date.now();
    const activityId = await ctx.db.insert("automationActivity", {
      idempotencyKey: args.idempotencyKey,
      requestId: args.requestId,
      loanId: args.loanId,
      eventType: args.eventType,
      recipientUserId: args.recipientUserId,
      result: args.result,
      summary: args.summary,
      createdAt: now,
    });

    return {
      success: true,
      activityId,
      duplicate: false,
      updated: false,
    };
  },
});

/**
 * INTERNAL MUTATION: Insert Outbox Event
 * Helper to create an outbox event atomically inside business mutations.
 */
export const insertOutboxEvent = internalMutation({
  args: {
    eventType: outboxEventTypeValidator,
    requestId: v.id("borrowRequests"),
    loanId: v.optional(v.id("loans")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const eventId = `evt_${now}_${Math.random().toString(36).slice(2, 9)}`;

    const id = await ctx.db.insert("automationOutbox", {
      eventId,
      eventType: args.eventType,
      requestId: args.requestId,
      loanId: args.loanId,
      status: "pending",
      attempts: 0,
      nextRetryAt: now,
      createdAt: now,
    });

    return { id, eventId };
  },
});

/**
 * INTERNAL MUTATION: Claim Eligible Pending Outbox Events
 * - Recovers stale processing events based on processingStartedAt timestamp
 * - Atomically locks batch with a unique claimToken and processingStartedAt
 * - Prevents race conditions and worker claim contention
 */
export const claimEligibleEvents = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const batchLimit = args.limit || 10;

    // 1. Recover stale processing events based on processingStartedAt
    const staleProcessing = await ctx.db
      .query("automationOutbox")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();

    for (const stale of staleProcessing) {
      const processingStartTime = stale.processingStartedAt ?? stale.createdAt;
      if (now - processingStartTime > STALE_PROCESSING_TIMEOUT_MS) {
        await ctx.db.patch(stale._id, {
          status: "pending",
          claimToken: undefined,
          processingStartedAt: undefined,
          lastError: "Worker timeout: reclaimed from stale processing state.",
        });
      }
    }

    // 2. Fetch eligible pending events
    const pendingEvents = await ctx.db
      .query("automationOutbox")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const eligible = pendingEvents
      .filter((evt) => evt.nextRetryAt <= now)
      .slice(0, batchLimit);

    const claimed: { outboxId: Id<"automationOutbox">; claimToken: string }[] = [];

    // Atomically transition each event to 'processing' with a unique claim token
    for (const evt of eligible) {
      const claimToken = `claim_${now}_${Math.random().toString(36).slice(2, 9)}`;
      await ctx.db.patch(evt._id, {
        status: "processing",
        processingStartedAt: now,
        claimToken,
      });
      claimed.push({ outboxId: evt._id, claimToken });
    }

    return claimed;
  },
});

/**
 * INTERNAL QUERY: Retrieve Enriched Event Data for Webhook Dispatch
 * Safely enriches payload and returns null if referenced entities cannot be found.
 */
export const getEventPayload = internalQuery({
  args: {
    outboxId: v.id("automationOutbox"),
  },
  handler: async (ctx, args) => {
    try {
      const event = await ctx.db.get(args.outboxId);
      if (!event) return null;

      const request = await ctx.db.get(event.requestId);
      const loan = event.loanId ? await ctx.db.get(event.loanId) : null;
      const tool = request ? await ctx.db.get(request.toolId) : null;
      const lender = request ? await ctx.db.get(request.lenderId) : null;
      const borrower = request ? await ctx.db.get(request.borrowerId) : null;

      return {
        event,
        request,
        loan,
        tool,
        lender: lender
          ? {
              _id: lender._id,
              displayName: lender.displayName,
              email: lender.email || null,
              clerkUserId: lender.clerkUserId,
              isTrustedLender: lender.isTrustedLender,
            }
          : null,
        borrower: borrower
          ? {
              _id: borrower._id,
              displayName: borrower.displayName,
              email: borrower.email || null,
              clerkUserId: borrower.clerkUserId,
              isTrustedLender: borrower.isTrustedLender,
            }
          : null,
      };
    } catch {
      return null;
    }
  },
});

/**
 * INTERNAL MUTATION: Mark Event as Successfully Sent
 * Enforces mandatory claimToken and validates active 'processing' status
 * to prevent expired or unauthorized workers from overwriting newer claims.
 */
export const markEventSuccess = internalMutation({
  args: {
    outboxId: v.id("automationOutbox"),
    claimToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.claimToken || args.claimToken.trim() === "") {
      throw new Error("Validation Error: claimToken is mandatory to mark event success.");
    }

    const event = await ctx.db.get(args.outboxId);
    if (!event) {
      throw new Error("Not Found: Outbox event does not exist.");
    }

    // Reject updates when the event is no longer in processing state
    if (event.status !== "processing") {
      throw new Error(
        `Invalid State: Cannot mark event as sent because event status is '${event.status}', expected 'processing'.`
      );
    }

    // Reject a mismatched or expired claim token
    if (!event.claimToken || event.claimToken !== args.claimToken) {
      throw new Error(
        `Claim Ownership Error: Worker claim token '${args.claimToken}' does not match active claim '${event.claimToken || "none"}'.`
      );
    }

    await ctx.db.patch(args.outboxId, {
      status: "sent",
      claimToken: undefined,
      processingStartedAt: undefined,
      lastError: undefined,
    });
    return { success: true };
  },
});

/**
 * INTERNAL MUTATION: Mark Event as Failed with Exponential Backoff
 * Enforces mandatory claimToken and validates active 'processing' status
 * to prevent expired or unauthorized workers from overwriting newer claims.
 */
export const markEventFailure = internalMutation({
  args: {
    outboxId: v.id("automationOutbox"),
    claimToken: v.string(),
    errorMessage: v.string(),
    terminal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.claimToken || args.claimToken.trim() === "") {
      throw new Error("Validation Error: claimToken is mandatory to mark event failure.");
    }

    const event = await ctx.db.get(args.outboxId);
    if (!event) {
      throw new Error("Not Found: Outbox event does not exist.");
    }

    // Reject updates when the event is no longer in processing state
    if (event.status !== "processing") {
      throw new Error(
        `Invalid State: Cannot mark event as failure because event status is '${event.status}', expected 'processing'.`
      );
    }

    // Reject a mismatched or expired claim token
    if (!event.claimToken || event.claimToken !== args.claimToken) {
      throw new Error(
        `Claim Ownership Error: Worker claim token '${args.claimToken}' does not match active claim '${event.claimToken || "none"}'.`
      );
    }

    const newAttempts = event.attempts + 1;
    const isTerminal = args.terminal || newAttempts >= MAX_RETRY_ATTEMPTS;

    if (isTerminal) {
      await ctx.db.patch(event._id, {
        status: "failed",
        attempts: newAttempts,
        claimToken: undefined,
        processingStartedAt: undefined,
        lastError: args.errorMessage,
      });
      return {
        status: "failed",
        attempts: newAttempts,
        nextRetryAt: 0,
      };
    } else {
      // Exponential backoff: 2s, 4s, 8s, 16s... up to max 1 hour
      const backoffDelay = Math.min(
        2000 * Math.pow(2, newAttempts - 1),
        60 * 60 * 1000
      );
      const nextRetryAt = Date.now() + backoffDelay;
      await ctx.db.patch(event._id, {
        status: "pending",
        attempts: newAttempts,
        nextRetryAt,
        claimToken: undefined,
        processingStartedAt: undefined,
        lastError: args.errorMessage,
      });
      return {
        status: "pending",
        attempts: newAttempts,
        nextRetryAt,
      };
    }
  },
});

/**
 * INTERNAL ACTION: Process Outbox Batch and Deliver to n8n Webhook
 * - Requires real N8N_WEBHOOK_URL and N8N_WEBHOOK_HMAC_SECRET configuration
 * - Computes authentic HMAC-SHA256 signature
 * - Resolves destination URL based on event type
 * - Strictly rejects simulation fallback in production
 */
export const processOutboxBatch = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ processed: number; successCount: number; failureCount: number }> => {
    const rawWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const hmacSecret = process.env.N8N_WEBHOOK_HMAC_SECRET;

    // 1. Claim eligible events with unique claim tokens
    const claimedItems = await ctx.runMutation(internal.outbox.claimEligibleEvents, {
      limit: args.limit || 10,
    });

    if (claimedItems.length === 0) {
      return { processed: 0, successCount: 0, failureCount: 0 };
    }

    // 2. Enforce strict configuration requirements (NO false simulated successes)
    if (!rawWebhookUrl || !hmacSecret) {
      const configError = !rawWebhookUrl
        ? "Configuration Error: N8N_WEBHOOK_URL environment variable is missing."
        : "Configuration Error: N8N_WEBHOOK_HMAC_SECRET environment variable is missing.";

      for (const item of claimedItems) {
        await ctx.runMutation(internal.outbox.markEventFailure, {
          outboxId: item.outboxId,
          claimToken: item.claimToken,
          errorMessage: configError,
        });
      }

      return {
        processed: claimedItems.length,
        successCount: 0,
        failureCount: claimedItems.length,
      };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const item of claimedItems) {
      const payloadData = await ctx.runQuery(internal.outbox.getEventPayload, {
        outboxId: item.outboxId,
      });

      if (!payloadData || !payloadData.event) {
        // Entity enrichment failed (e.g. corrupted reference)
        await ctx.runMutation(internal.outbox.markEventFailure, {
          outboxId: item.outboxId,
          claimToken: item.claimToken,
          errorMessage: "Payload Error: Unable to enrich event data. Referenced entity missing.",
          terminal: true,
        });
        failureCount++;
        continue;
      }

      const { event, request, loan, tool, lender, borrower } = payloadData;

      // 3. Resolve destination URL based on event type
      const targetUrl = resolveWebhookUrl(event.eventType, rawWebhookUrl);
      if (!targetUrl) {
        await ctx.runMutation(internal.outbox.markEventFailure, {
          outboxId: item.outboxId,
          claimToken: item.claimToken,
          errorMessage: `Routing Error: Unsupported event type "${event.eventType}". No workflow route found.`,
          terminal: true,
        });
        failureCount++;
        continue;
      }

      const timestamp = Date.now();
      const webhookPayload = {
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp,
        data: {
          requestId: event.requestId,
          loanId: event.loanId || null,
          startDate: request?.startDate || null,
          endDate: request?.endDate || null,
          tool: tool
            ? {
                _id: tool._id,
                name: tool.name,
                category: tool.category,
              }
            : null,
          lender,
          borrower,
          loan: loan
            ? {
                _id: loan._id,
                dueDate: loan.dueDate,
                status: loan.status,
              }
            : null,
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = await generateWebhookSignature(rawBody, hmacSecret, timestamp);

      try {
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-LendLoop-Signature": `sha256=${signature}`,
            "X-LendLoop-Timestamp": timestamp.toString(),
            "X-LendLoop-Event": event.eventType,
          },
          body: rawBody,
        });

        if (response.ok) {
          let responseData: { result?: unknown; summary?: unknown } | null = null;
          try {
            responseData = await response.json();
          } catch {
            // response was not JSON
          }

          // Acknowledge completion ONLY if provider confirmation verifies delivery
          if (responseData && responseData.result === "sent") {
            const res = await ctx.runMutation(internal.outbox.markEventSuccess, {
              outboxId: item.outboxId,
              claimToken: item.claimToken,
            });

            if (res && res.success) {
              successCount++;
            } else {
              // Claim was lost to another worker
              failureCount++;
            }
          } else if (responseData && responseData.result === "failed") {
            // Notification provider or recipient address failed explicitly
            const failureReason =
              typeof responseData.summary === "string"
                ? responseData.summary
                : "Notification provider reported failure.";
            await ctx.runMutation(internal.outbox.markEventFailure, {
              outboxId: item.outboxId,
              claimToken: item.claimToken,
              errorMessage: failureReason,
            });
            failureCount++;
          } else {
            // Webhook accepted without delivery confirmation (e.g. onReceived or unconfirmed execution)
            // Never falsely mark as sent. Queue for recovery/retry.
            await ctx.runMutation(internal.outbox.markEventFailure, {
              outboxId: item.outboxId,
              claimToken: item.claimToken,
              errorMessage:
                "Unacknowledged delivery: Webhook response did not confirm provider completion.",
            });
            failureCount++;
          }
        } else {
          const errorText = await response.text();
          const errorMsg = `HTTP ${response.status}: ${errorText.slice(0, 200)}`;
          await ctx.runMutation(internal.outbox.markEventFailure, {
            outboxId: item.outboxId,
            claimToken: item.claimToken,
            errorMessage: errorMsg,
          });
          failureCount++;
        }
      } catch (fetchErr: unknown) {
        const message =
          fetchErr instanceof Error ? fetchErr.message : "Network dispatch failed";
        await ctx.runMutation(internal.outbox.markEventFailure, {
          outboxId: item.outboxId,
          claimToken: item.claimToken,
          errorMessage: message,
        });
        failureCount++;
      }
    }

    return { processed: claimedItems.length, successCount, failureCount };
  },
});

/**
 * INTERNAL QUERY: Get Overdue Loans Needing Reminders
 */
export const getActiveOverdueLoans = internalQuery({
  args: {},
  handler: async (ctx) => {
    const today = getTodayUtcDateString();
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_status_and_due_date", (q) => q.eq("status", "active"))
      .collect();

    return activeLoans.filter((loan) => isOverdue(loan.dueDate, today));
  },
});

/**
 * INTERNAL MUTATION: Queue Overdue Outbox Event (Idempotent per Loan per UTC Calendar Day)
 * Prevents multiple overdue outbox events for the same loan on the same UTC calendar day.
 */
export const queueOverdueOutboxEvent = internalMutation({
  args: {
    loanId: v.id("loans"),
    requestId: v.id("borrowRequests"),
    today: v.string(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check if activity was already successfully recorded for today
    const existingActivity = await ctx.db
      .query("automationActivity")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existingActivity && existingActivity.result === "sent") {
      return { queued: false, reason: "already_sent_today" };
    }

    // 2. Check if an overdue outbox event was already created today
    const deterministicEventId = `overdue_${args.loanId}_${args.today}`;
    const existingOutbox = await ctx.db
      .query("automationOutbox")
      .withIndex("by_event_id", (q) => q.eq("eventId", deterministicEventId))
      .first();

    if (existingOutbox) {
      return { queued: false, reason: "already_in_outbox_today" };
    }

    const now = Date.now();
    const outboxId = await ctx.db.insert("automationOutbox", {
      eventId: deterministicEventId,
      eventType: "loan.overdue",
      requestId: args.requestId,
      loanId: args.loanId,
      status: "pending",
      attempts: 0,
      nextRetryAt: now,
      createdAt: now,
    });

    return { queued: true, outboxId };
  },
});

/**
 * INTERNAL ACTION: Periodic Scanner for Overdue Loans (Workflow D)
 * - Identifies active loans whose dueDate <= today
 * - Enforces deterministic daily idempotency: "overdue:<loanId>:<YYYY-MM-DD>"
 * - Queues reliable 'loan.overdue' outbox events (does NOT write false successful activity)
 * - Actual reminder notification delivery occurs through n8n
 */
export const scanOverdueLoansAndQueueOutbox = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{ totalOverdue: number; queued: number; alreadyQueuedOrReminded: number }> => {
    const today = getTodayUtcDateString();
    const overdueLoans = await ctx.runQuery(
      internal.outbox.getActiveOverdueLoans,
      {}
    );

    let queued = 0;
    let alreadyQueuedOrReminded = 0;

    for (const loan of overdueLoans) {
      const idempotencyKey = `overdue:${loan._id}:${today}`;
      const queueRes = await ctx.runMutation(
        internal.outbox.queueOverdueOutboxEvent,
        {
          loanId: loan._id,
          requestId: loan.requestId,
          today,
          idempotencyKey,
        }
      );

      if (queueRes.queued) {
        queued++;
      } else {
        alreadyQueuedOrReminded++;
      }
    }

    return {
      totalOverdue: overdueLoans.length,
      queued,
      alreadyQueuedOrReminded,
    };
  },
});

/**
 * INTERNAL QUERY: Validate Entities Referenced in Activity Write-Back
 * Validates document IDs and structural relationships before activity logging.
 */
export const validateActivityEntities = internalQuery({
  args: {
    requestId: v.optional(v.id("borrowRequests")),
    loanId: v.optional(v.id("loans")),
    recipientUserId: v.optional(v.id("users")),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.requestId) {
      const req = await ctx.db.get(args.requestId);
      if (!req) return { valid: false, error: "Referenced requestId does not exist." };
    }

    if (args.loanId) {
      const loan = await ctx.db.get(args.loanId);
      if (!loan) return { valid: false, error: "Referenced loanId does not exist." };
      if (args.requestId && loan.requestId !== args.requestId) {
        return { valid: false, error: "loanId does not match the provided requestId." };
      }
    }

    if (args.recipientUserId) {
      const user = await ctx.db.get(args.recipientUserId);
      if (!user) return { valid: false, error: "Referenced recipientUserId does not exist." };
    }

    if ((args.eventType === "loan.returned" || args.eventType === "loan.overdue") && !args.loanId) {
      return { valid: false, error: `eventType '${args.eventType}' requires a valid loanId.` };
    }

    return { valid: true };
  },
});
