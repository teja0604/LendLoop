import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  DEFAULT_TIMESTAMP_TOLERANCE_MS,
} from "../convex/webhookSecurity";
import { resolveWebhookUrl } from "../convex/outbox";

const modules = {
  "../convex/_generated/api.js": () => import("../convex/_generated/api.js"),
  "../convex/admin.ts": () => import("../convex/admin"),
  "../convex/users.ts": () => import("../convex/users"),
  "../convex/tools.ts": () => import("../convex/tools"),
  "../convex/loans.ts": () => import("../convex/loans"),
  "../convex/borrowRequests.ts": () => import("../convex/borrowRequests"),
  "../convex/authHelpers.ts": () => import("../convex/authHelpers"),
  "../convex/dateUtils.ts": () => import("../convex/dateUtils"),
  "../convex/outbox.ts": () => import("../convex/outbox"),
  "../convex/webhookSecurity.ts": () => import("../convex/webhookSecurity"),
};

test("Phase 7: n8n Automation and Webhook Integration Comprehensive Test Suite", async () => {
  console.log("\n===================================================================");
  console.log("Running Phase 7 Comprehensive Automation, Outbox & Security Suite...");
  console.log("===================================================================\n");

  const t = convexTest(schema, modules);

  // -------------------------------------------------------------------
  // Setup Test Users and Tool
  // -------------------------------------------------------------------
  const lenderId: Id<"users"> = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkUserId: "clerk_lender_phase7",
      displayName: "Alice Lender",
      email: "alice.lender@neighborhood.org",
      role: "user",
      isTrustedLender: true,
      createdAt: Date.now(),
    });
  });

  const borrowerId: Id<"users"> = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkUserId: "clerk_borrower_phase7",
      displayName: "Bob Borrower",
      email: "bob.borrower@neighborhood.org",
      role: "user",
      isTrustedLender: false,
      createdAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkUserId: "clerk_admin_phase7",
      displayName: "Admin Carol",
      email: "admin.carol@lendloop.org",
      role: "admin",
      isTrustedLender: false,
      createdAt: Date.now(),
    });
  });

  const toolId: Id<"tools"> = await t.run(async (ctx) => {
    return await ctx.db.insert("tools", {
      ownerId: lenderId,
      name: "DeWalt Cordless Drill",
      category: "Power Tools",
      condition: "Excellent",
      description: "High torque cordless drill with two batteries",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const asLender = t.withIdentity({ subject: "clerk_lender_phase7" });
  const asBorrower = t.withIdentity({ subject: "clerk_borrower_phase7" });
  const asAdmin = t.withIdentity({ subject: "clerk_admin_phase7" });

  // ===================================================================
  // 1. TRANSACTIONAL OUTBOX: ATOMIC INTEGRATION TESTS
  // ===================================================================
  console.log("--- 1. Transactional Outbox Atomic Event Emission ---");

  let requestId: Id<"borrowRequests">;
  let loanId: Id<"loans">;

  // 1.1 Creating a borrow request atomically inserts 'borrow_request.created' into outbox
  {
    const reqRes = await asBorrower.mutation(api.borrowRequests.createRequest, {
      toolId,
      startDate: "2026-11-10",
      endDate: "2026-11-14",
    });

    assert.ok(reqRes, "Borrow request must be created");
    requestId = reqRes;

    const outboxEvent = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationOutbox")
        .filter((q) =>
          q.and(
            q.eq(q.field("requestId"), requestId),
            q.eq(q.field("eventType"), "borrow_request.created")
          )
        )
        .first();
    });

    assert.ok(outboxEvent, "Outbox must contain borrow_request.created event");
    assert.equal(outboxEvent.status, "pending");
    assert.equal(outboxEvent.attempts, 0);
    assert.ok(outboxEvent.eventId, "Event must have a UUID eventId");
    console.log("✔ Test 1.1 Passed: borrow_request.created event atomically emitted into outbox.");
  }

  // 1.2 Approving a borrow request atomically inserts 'borrow_request.approved' and NOT redundant 'loan.created'
  {
    const approveRes = await asLender.mutation(api.borrowRequests.approveRequest, {
      requestId,
    });

    assert.equal(approveRes.success, true);
    assert.ok(approveRes.loanId, "Loan must be created");
    loanId = approveRes.loanId;

    const approvalEvents = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationOutbox")
        .filter((q) => q.eq(q.field("requestId"), requestId))
        .collect();
    });

    const approvedEvent = approvalEvents.find((e) => e.eventType === "borrow_request.approved");
    const loanCreatedEvent = approvalEvents.find((e) => e.eventType === "loan.created");

    assert.ok(approvedEvent, "Outbox must contain borrow_request.approved event");
    assert.equal(approvedEvent.loanId, loanId, "borrow_request.approved must reference loanId");
    assert.equal(loanCreatedEvent, undefined, "loan.created must NOT be emitted to prevent duplicate approval emails");
    console.log("✔ Test 1.2 Passed: borrow_request.approved emitted with loanId; redundant loan.created omitted.");
  }

  // 1.3 Declining a borrow request atomically inserts 'borrow_request.declined'
  {
    const req2Id = await asBorrower.mutation(api.borrowRequests.createRequest, {
      toolId,
      startDate: "2026-11-20",
      endDate: "2026-11-25",
    });

    const declineRes = await asLender.mutation(api.borrowRequests.declineRequest, {
      requestId: req2Id,
    });
    assert.equal(declineRes.success, true);

    const declinedEvent = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationOutbox")
        .filter((q) =>
          q.and(
            q.eq(q.field("requestId"), req2Id),
            q.eq(q.field("eventType"), "borrow_request.declined")
          )
        )
        .first();
    });

    assert.ok(declinedEvent, "Outbox must contain borrow_request.declined event");
    assert.equal(declinedEvent.status, "pending");
    console.log("✔ Test 1.3 Passed: borrow_request.declined atomically emitted into outbox.");
  }

  // 1.4 Returning a loan atomically inserts 'loan.returned'
  {
    const returnRes = await asLender.mutation(api.loans.markReturned, {
      loanId,
    });
    assert.equal(returnRes.success, true);

    const returnedEvent = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationOutbox")
        .filter((q) =>
          q.and(
            q.eq(q.field("requestId"), requestId),
            q.eq(q.field("eventType"), "loan.returned")
          )
        )
        .first();
    });

    assert.ok(returnedEvent, "Outbox must contain loan.returned event");
    assert.equal(returnedEvent.loanId, loanId);
    assert.equal(returnedEvent.status, "pending");
    console.log("✔ Test 1.4 Passed: loan.returned atomically emitted into outbox.");
  }

  // ===================================================================
  // 2. STALE PROCESSING RECOVERY & CLAIM OWNERSHIP
  // ===================================================================
  console.log("\n--- 2. Stale Processing Recovery & Claim Ownership ---");

  // 2.1 Stale recovery evaluates processingStartedAt, not createdAt
  {
    const now = Date.now();
    const staleEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: "test_stale_processing_time",
        eventType: "borrow_request.created",
        requestId,
        status: "processing",
        attempts: 1,
        nextRetryAt: 0,
        createdAt: now - 60 * 60 * 1000, // Created 1 hour ago
        processingStartedAt: now - 6 * 60 * 1000, // Claimed 6 minutes ago (stale > 5m)
        claimToken: "old_token_123",
      });
    });

    const claimed = await t.mutation(internal.outbox.claimEligibleEvents, { limit: 10 });
    const match = claimed.find((c) => c.outboxId === staleEventId);
    assert.ok(match, "Event with processingStartedAt > 5m must be reclaimed");

    const refreshed = await t.run(async (ctx) => ctx.db.get(staleEventId));
    assert.equal(refreshed?.status, "processing");
    assert.notEqual(refreshed?.claimToken, "old_token_123", "New claimToken must be assigned");
    assert.ok(refreshed?.processingStartedAt && refreshed.processingStartedAt >= now);
    console.log("✔ Test 2.1 Passed: Stale processing recovered based on processingStartedAt.");
  }

  // 2.2 Claim ownership prevents stale workers from overwriting newer claims
  {
    await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: "test_claim_ownership_uuid",
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    const claimed = await t.mutation(internal.outbox.claimEligibleEvents, { limit: 1 });
    assert.ok(claimed.length > 0);
    const { outboxId, claimToken } = claimed[0];

    // Attempt completion with empty token is rejected
    await assert.rejects(
      async () => {
        await t.mutation(internal.outbox.markEventSuccess, {
          outboxId,
          claimToken: "",
        });
      },
      (err: Error) => {
        assert.match(err.message, /claimToken is mandatory/);
        return true;
      }
    );

    // Attempt completion with wrong token is rejected
    await assert.rejects(
      async () => {
        await t.mutation(internal.outbox.markEventSuccess, {
          outboxId,
          claimToken: "wrong_expired_token",
        });
      },
      (err: Error) => {
        assert.match(err.message, /Worker claim token 'wrong_expired_token' does not match active claim/);
        return true;
      }
    );

    // Completion with legitimate matching token succeeds
    const successRes = await t.mutation(internal.outbox.markEventSuccess, {
      outboxId,
      claimToken,
    });
    assert.equal(successRes.success, true);

    const doc = await t.run(async (ctx) => ctx.db.get(outboxId));
    assert.equal(doc?.status, "sent");

    // Attempt completion when status is no longer 'processing' is rejected
    await assert.rejects(
      async () => {
        await t.mutation(internal.outbox.markEventSuccess, {
          outboxId,
          claimToken,
        });
      },
      (err: Error) => {
        assert.match(err.message, /expected 'processing'/);
        return true;
      }
    );
    console.log("✔ Test 2.2 Passed: Claim ownership strictly protects markEventSuccess against stale/invalid workers.");
  }

  // 2.3 markEventFailure strictly enforces claim ownership and processing status
  {
    await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: "test_claim_failure_uuid",
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    const claimed = await t.mutation(internal.outbox.claimEligibleEvents, { limit: 1 });
    assert.ok(claimed.length > 0);
    const { outboxId, claimToken } = claimed[0];

    // Empty claim token rejected
    await assert.rejects(
      async () => {
        await t.mutation(internal.outbox.markEventFailure, {
          outboxId,
          claimToken: "   ",
          errorMessage: "Missing token",
        });
      },
      (err: Error) => {
        assert.match(err.message, /claimToken is mandatory/);
        return true;
      }
    );

    // Mismatched token rejected
    await assert.rejects(
      async () => {
        await t.mutation(internal.outbox.markEventFailure, {
          outboxId,
          claimToken: "mismatched_token",
          errorMessage: "Failed attempt",
        });
      },
      (err: Error) => {
        assert.match(err.message, /Worker claim token 'mismatched_token' does not match active claim/);
        return true;
      }
    );

    // Valid claim token marks failure and schedules retry
    const failRes = await t.mutation(internal.outbox.markEventFailure, {
      outboxId,
      claimToken,
      errorMessage: "Network timeout test",
    });
    assert.equal(failRes.status, "pending");
    assert.equal(failRes.attempts, 1);
    assert.ok(failRes.nextRetryAt > Date.now());

    // Once back in pending, cannot mark failure without re-claiming
    await assert.rejects(
      async () => {
        await t.mutation(internal.outbox.markEventFailure, {
          outboxId,
          claimToken,
          errorMessage: "Repeated failure without claiming",
        });
      },
      (err: Error) => {
        assert.match(err.message, /expected 'processing'/);
        return true;
      }
    );
    console.log("✔ Test 2.3 Passed: Claim ownership strictly protects markEventFailure against stale/invalid workers.");
  }

  // ===================================================================
  // 3. CONFIGURATION FAILURE HANDLING & NO FALSE SUCCESS
  // ===================================================================
  console.log("\n--- 3. Configuration Failure Handling & No False Success ---");

  // 3.1 Missing webhook URL or secret produces configuration failure, never simulated success
  {
    // Ensure a pending event is available to be claimed
    await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_config_failure_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    // Temporarily clear environment variables
    const originalUrl = process.env.N8N_WEBHOOK_URL;
    const originalSecret = process.env.N8N_WEBHOOK_HMAC_SECRET;

    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_HMAC_SECRET;

    const res = await t.action(internal.outbox.processOutboxBatch, { limit: 5 });
    assert.equal(res.successCount, 0, "Missing configuration must NEVER produce successCount > 0");
    assert.ok(res.failureCount > 0, "Missing configuration must record failureCount");

    // Restore
    if (originalUrl) process.env.N8N_WEBHOOK_URL = originalUrl;
    if (originalSecret) process.env.N8N_WEBHOOK_HMAC_SECRET = originalSecret;
    console.log("✔ Test 3.1 Passed: Missing configuration records failure, never false success.");
  }

  // 3.2 Webhook responding with verified provider delivery ({ result: "sent" }) confirms delivery
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const ackEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_ack_success_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    // Mock fetch returning provider success
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ result: "sent", summary: "Email successfully delivered via SMTP" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 1);
      assert.equal(res.failureCount, 0);

      const updated = await t.run(async (ctx) => ctx.db.get(ackEventId));
      assert.equal(updated?.status, "sent", "Event must be marked 'sent' only when n8n confirms result: 'sent'");
      console.log("✔ Test 3.2 Passed: Synchronous delivery acknowledgement marks event as 'sent' when provider succeeds.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3.3 Webhook responding with provider failure ({ result: "failed" }) triggers retry, never marks 'sent'
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const failEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_ack_failed_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    // Mock fetch returning provider failure
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ result: "failed", summary: "SMTP server refused connection: 535 Authentication failed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 0, "Provider failure must NOT produce successCount > 0");
      assert.equal(res.failureCount, 1);

      const updated = await t.run(async (ctx) => ctx.db.get(failEventId));
      assert.equal(updated?.status, "pending", "Failed provider response must schedule retry");
      assert.equal(updated?.attempts, 1);
      assert.match(updated?.lastError || "", /SMTP server refused connection/);
      console.log("✔ Test 3.3 Passed: Provider failure correctly marks outbox failure with backoff retry.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3.4 Webhook merely accepting request without provider delivery confirmation triggers retry
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const unackEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_unack_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    // Mock fetch returning asynchronous onReceived acceptance (no result: 'sent')
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ message: "Workflow was started" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 0, "Mere webhook acceptance must NOT count as delivery success");
      assert.equal(res.failureCount, 1);

      const updated = await t.run(async (ctx) => ctx.db.get(unackEventId));
      assert.equal(updated?.status, "pending");
      assert.match(updated?.lastError || "", /Unacknowledged delivery/);
      console.log("✔ Test 3.4 Passed: Asynchronous/unacknowledged acceptance is never falsely marked as sent.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3.5 HTTP server error from webhook endpoint triggers retry
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const httpErrorEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_http_err_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    globalThis.fetch = async () => {
      return new Response("Internal Server Error in n8n execution engine", {
        status: 500,
        statusText: "Internal Server Error",
      });
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 0);
      assert.equal(res.failureCount, 1);

      const updated = await t.run(async (ctx) => ctx.db.get(httpErrorEventId));
      assert.equal(updated?.status, "pending");
      assert.match(updated?.lastError || "", /HTTP 500/);
      console.log("✔ Test 3.5 Passed: HTTP 500 error from n8n schedules retry with diagnostic log.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3.6 Malformed JSON response or empty body triggers retry with unacknowledged delivery error
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const malformedEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_malformed_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    globalThis.fetch = async () => {
      return new Response("not-valid-json", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 0);
      assert.equal(res.failureCount, 1);

      const updated = await t.run(async (ctx) => ctx.db.get(malformedEventId));
      assert.equal(updated?.status, "pending");
      assert.match(updated?.lastError || "", /Unacknowledged delivery/);
      console.log("✔ Test 3.6 Passed: Malformed non-JSON response treated as unacknowledged delivery with retry scheduled.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3.7 Missing recipient address error response triggers retry with provider diagnostic
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const missingRecipientEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_missing_recip_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          delivered: false,
          result: "failed",
          summary: "Notification skipped: Recipient email address not configured.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 0);
      assert.equal(res.failureCount, 1);

      const updated = await t.run(async (ctx) => ctx.db.get(missingRecipientEventId));
      assert.equal(updated?.status, "pending");
      assert.match(updated?.lastError || "", /Notification skipped: Recipient email address not configured/);
      console.log("✔ Test 3.7 Passed: Missing recipient address correctly triggers retry with descriptive summary.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3.8 Convex writeback failure during n8n execution cannot return false success
  {
    const originalFetch = globalThis.fetch;
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook";
    process.env.N8N_WEBHOOK_HMAC_SECRET = "test_hmac_secret_32_bytes_long_12345678";

    const writebackFailEventId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: `test_wb_fail_${Date.now()}`,
        eventType: "borrow_request.created",
        requestId,
        status: "pending",
        attempts: 0,
        nextRetryAt: 0,
        createdAt: Date.now(),
      });
    });

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          delivered: false,
          result: "failed",
          summary: "Delivery succeeded but Convex activity writeback failed: {\"error\":\"Internal error\"}",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    try {
      const res = await t.action(internal.outbox.processOutboxBatch, { limit: 1 });
      assert.equal(res.successCount, 0, "Writeback failure must NEVER produce successCount > 0");
      assert.equal(res.failureCount, 1);

      const updated = await t.run(async (ctx) => ctx.db.get(writebackFailEventId));
      assert.equal(updated?.status, "pending");
      assert.match(updated?.lastError || "", /Convex activity writeback failed/);
      console.log("✔ Test 3.8 Passed: Convex activity writeback failure correctly triggers retry, never false success.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ===================================================================
  // 4. WEBHOOK ROUTING & UNSUPPORTED EVENT HANDLING
  // ===================================================================
  console.log("\n--- 4. Webhook Routing & Unsupported Event Handling ---");

  {
    const base = "http://localhost:5678/webhook";
    assert.equal(resolveWebhookUrl("borrow_request.created", base), "http://localhost:5678/webhook/lendloop-request-created");
    assert.equal(resolveWebhookUrl("borrow_request.approved", base), "http://localhost:5678/webhook/lendloop-request-decision");
    assert.equal(resolveWebhookUrl("borrow_request.declined", base), "http://localhost:5678/webhook/lendloop-request-decision");
    assert.equal(resolveWebhookUrl("loan.returned", base), "http://localhost:5678/webhook/lendloop-loan-returned");
    assert.equal(resolveWebhookUrl("loan.overdue", base), "http://localhost:5678/webhook/lendloop-overdue-reminder");

    // Unsupported event types return null (including redundant loan.created and unknown types)
    assert.equal(resolveWebhookUrl("loan.created", base), null, "loan.created must be rejected as unsupported route");
    assert.equal(resolveWebhookUrl("unknown.event.type", base), null);
    console.log("✔ Test 4.1 Passed: Webhook routing correctly maps all active event types and rejects unsupported events.");
  }

  // ===================================================================
  // 5. REAL HMAC-SHA256 SECURITY & REPLAY DEFENSE
  // ===================================================================
  console.log("\n--- 5. Real HMAC-SHA256 Security & Replay Defense ---");

  const secret = "test_super_secret_webhook_key_12345";
  const payload = JSON.stringify({
    eventType: "borrow_request.created",
    requestId: "req_12345",
    data: { test: true },
  });
  const now = Date.now();

  // 5.1 Valid signature and fresh timestamp
  {
    const signature = await generateWebhookSignature(payload, secret, now);
    const result = await verifyWebhookSignature({
      payload,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: now.toString(),
      secret,
      currentTimestamp: now,
    });
    assert.equal(result.isValid, true);
    console.log("✔ Test 5.1 Passed: Authentic HMAC-SHA256 signature verified.");
  }

  // 5.2 Tampered payload rejected
  {
    const signature = await generateWebhookSignature(payload, secret, now);
    const tamperedPayload = payload + " ";
    const result = await verifyWebhookSignature({
      payload: tamperedPayload,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: now.toString(),
      secret,
      currentTimestamp: now,
    });
    assert.equal(result.isValid, false);
    assert.match(result.error || "", /Signature mismatch/);
    console.log("✔ Test 5.2 Passed: Tampered payload rejected.");
  }

  // 5.3 Expired timestamp rejected (> 5 min)
  {
    const expiredTimestamp = now - (DEFAULT_TIMESTAMP_TOLERANCE_MS + 10000);
    const signature = await generateWebhookSignature(payload, secret, expiredTimestamp);
    const result = await verifyWebhookSignature({
      payload,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: expiredTimestamp.toString(),
      secret,
      currentTimestamp: now,
    });
    assert.equal(result.isValid, false);
    assert.match(result.error || "", /expired or outside tolerance/);
    console.log("✔ Test 5.3 Passed: Expired timestamp rejected.");
  }

  // 5.4 Missing headers rejected
  {
    const missingSig = await verifyWebhookSignature({
      payload,
      signatureHeader: null,
      timestampHeader: now.toString(),
      secret,
    });
    assert.equal(missingSig.isValid, false);

    const missingTs = await verifyWebhookSignature({
      payload,
      signatureHeader: "sha256=abcdef",
      timestampHeader: null,
      secret,
    });
    assert.equal(missingTs.isValid, false);
    console.log("✔ Test 5.4 Passed: Missing headers rejected.");
  }

  // ===================================================================
  // 6. IDEMPOTENT ACTIVITY RETRY BEHAVIOR (FAILED -> SUCCESS)
  // ===================================================================
  console.log("\n--- 6. Idempotent Activity Retry Behavior (Failed -> Success) ---");

  const testKey = `test_key_retry_${Date.now()}`;

  // 6.1 First attempt fails -> recorded as 'failed'
  {
    const res1 = await t.mutation(internal.outbox.recordActivityInternal, {
      idempotencyKey: testKey,
      requestId,
      loanId,
      eventType: "borrow_request.created",
      recipientUserId: lenderId,
      result: "failed",
      summary: "SMTP delivery connection timeout",
    });

    assert.equal(res1.success, true);
    assert.equal(res1.duplicate, false);

    const doc1 = await t.run(async (ctx) => ctx.db.get(res1.activityId));
    assert.equal(doc1?.result, "failed");
    console.log("✔ Test 6.1 Passed: Initial failure attempt recorded.");
  }

  // 6.2 Retry succeeds -> existing record updated to 'sent'
  {
    const res2 = await t.mutation(internal.outbox.recordActivityInternal, {
      idempotencyKey: testKey,
      requestId,
      loanId,
      eventType: "borrow_request.created",
      recipientUserId: lenderId,
      result: "sent",
      summary: "SMTP retry succeeded. Email delivered.",
    });

    assert.equal(res2.success, true);
    assert.equal(res2.updated, true, "Failed record must be updated on successful retry");

    const doc2 = await t.run(async (ctx) => ctx.db.get(res2.activityId));
    assert.equal(doc2?.result, "sent", "Result must now reflect 'sent'");
    assert.ok(doc2?.updatedAt, "updatedAt timestamp must be recorded");
    console.log("✔ Test 6.2 Passed: Retry successfully updates failed activity record to 'sent'.");
  }

  // 6.3 Repeated success -> deduplicated, no duplicates created
  {
    const res3 = await t.mutation(internal.outbox.recordActivityInternal, {
      idempotencyKey: testKey,
      requestId,
      loanId,
      eventType: "borrow_request.created",
      recipientUserId: lenderId,
      result: "sent",
      summary: "Duplicate success delivery",
    });

    assert.equal(res3.success, true);
    assert.equal(res3.duplicate, true, "Duplicate success delivery must be deduplicated");

    const totalRecords = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationActivity")
        .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", testKey))
        .collect();
    });
    assert.equal(totalRecords.length, 1, "Exactly one record must exist in DB");
    console.log("✔ Test 6.3 Passed: Duplicate success delivery does not create duplicates.");
  }

  // 6.4 Late failure after success does not overwrite 'sent'
  {
    const res4 = await t.mutation(internal.outbox.recordActivityInternal, {
      idempotencyKey: testKey,
      requestId,
      loanId,
      eventType: "borrow_request.created",
      recipientUserId: lenderId,
      result: "failed",
      summary: "Late arriving failure response",
    });

    assert.equal(res4.duplicate, true);
    const doc4 = await t.run(async (ctx) => ctx.db.get(res4.activityId));
    assert.equal(doc4?.result, "sent", "Successful record must NOT be overwritten by stale failure");
    console.log("✔ Test 6.4 Passed: Late failure cannot overwrite a confirmed successful record.");
  }

  // ===================================================================
  // 7. INBOUND HTTP VALIDATION
  // ===================================================================
  console.log("\n--- 7. Inbound HTTP Entity & Relationship Validation ---");

  {
    // Valid entities
    const validCheck = await t.query(internal.outbox.validateActivityEntities, {
      requestId,
      loanId,
      recipientUserId: lenderId,
      eventType: "loan.returned",
    });
    assert.equal(validCheck.valid, true);

    // Non-existent user rejected
    const nonExistentUserId = await t.run(async (ctx) => {
      const tempId = await ctx.db.insert("users", {
        clerkUserId: "temp_delete_test",
        displayName: "Temp",
        role: "user",
        isTrustedLender: false,
        createdAt: Date.now(),
      });
      await ctx.db.delete(tempId);
      return tempId;
    });

    const invalidUser = await t.query(internal.outbox.validateActivityEntities, {
      recipientUserId: nonExistentUserId,
      eventType: "borrow_request.created",
    });
    assert.equal(invalidUser.valid, false);

    // loan.returned without loanId rejected
    const missingLoan = await t.query(internal.outbox.validateActivityEntities, {
      requestId,
      eventType: "loan.returned",
    });
    assert.equal(missingLoan.valid, false);
    assert.match(missingLoan.error || "", /requires a valid loanId/);
    console.log("✔ Test 7.1 Passed: Inbound activity entity and relationship validation verified.");
  }

  // ===================================================================
  // 8. OVERDUE SCANNER & DAILY OUTBOX DEDUPLICATION
  // ===================================================================
  console.log("\n--- 8. Overdue Scanner & Daily Outbox Deduplication ---");

  let overdueLoanId: Id<"loans">;
  {
    const overdueRequestId = await t.run(async (ctx) => {
      return await ctx.db.insert("borrowRequests", {
        toolId,
        borrowerId,
        lenderId,
        startDate: "2026-10-01",
        endDate: "2026-10-10",
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    overdueLoanId = await t.run(async (ctx) => {
      return await ctx.db.insert("loans", {
        toolId,
        borrowerId,
        lenderId,
        requestId: overdueRequestId,
        startDate: "2026-10-01",
        dueDate: "2026-10-10", // In the past
        status: "active",
        createdAt: Date.now(),
      });
    });

    // Run overdue scan: queues an outbox event
    const scan1 = await t.action(internal.outbox.scanOverdueLoansAndQueueOutbox, {});
    assert.ok(scan1.queued >= 1, "Must queue at least 1 overdue outbox event");

    // Second run on same day: detects already queued/reminded, queues 0
    const scan2 = await t.action(internal.outbox.scanOverdueLoansAndQueueOutbox, {});
    assert.equal(scan2.queued, 0, "No duplicate overdue events queued on same UTC day");
    assert.ok(scan2.alreadyQueuedOrReminded >= 1);

    // Verify overdue outbox event created
    const overdueEvent = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationOutbox")
        .filter((q) =>
          q.and(
            q.eq(q.field("loanId"), overdueLoanId),
            q.eq(q.field("eventType"), "loan.overdue")
          )
        )
        .first();
    });
    assert.ok(overdueEvent, "Outbox event for loan.overdue must exist");
    assert.equal(overdueEvent.status, "pending");
    console.log("✔ Test 8.1 Passed: Overdue scan queues outbox event with daily deduplication.");
  }

  // ===================================================================
  // 9. N8N WORKFLOW JSON STRUCTURE & INTEGRITY VERIFICATION
  // ===================================================================
  console.log("\n--- 9. n8n Workflow JSON Files Integrity ---");

  const workflowFiles = [
    "workflow_a_request_created.json",
    "workflow_b_request_decision.json",
    "workflow_c_loan_returned.json",
    "workflow_d_overdue_reminder.json",
  ];

  for (const wfFile of workflowFiles) {
    const fullPath = path.resolve(process.cwd(), "n8n", "workflows", wfFile);
    assert.ok(fs.existsSync(fullPath), `Workflow file must exist: ${wfFile}`);

    const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    assert.ok(content.nodes && Array.isArray(content.nodes), `${wfFile} must contain nodes array`);

    // Verify presence of webhook trigger, email provider, and HMAC verification
    const nodeTypes = content.nodes.map((n: { type: string }) => n.type);
    assert.ok(nodeTypes.includes("n8n-nodes-base.webhook"), `${wfFile} must have webhook node`);
    assert.ok(nodeTypes.includes("n8n-nodes-base.emailSend"), `${wfFile} must have emailSend provider node`);
    assert.ok(nodeTypes.includes("n8n-nodes-base.httpRequest"), `${wfFile} must have httpRequest writeback node`);
    assert.ok(nodeTypes.includes("n8n-nodes-base.code"), `${wfFile} must have code nodes`);
    assert.ok(nodeTypes.includes("n8n-nodes-base.respondToWebhook"), `${wfFile} must have respondToWebhook node`);

    // Verify presence of dedicated Format Final Delivery Response node
    const formatResponseNode = content.nodes.find((n: { name: string }) => n.name === "Format Final Delivery Response");
    assert.ok(formatResponseNode, `${wfFile} must contain 'Format Final Delivery Response' node`);

    // Verify webhook responseMode is 'responseNode' for synchronous acknowledgement
    const webhookNode = content.nodes.find((n: { type: string }) => n.type === "n8n-nodes-base.webhook");
    assert.equal(
      webhookNode?.parameters?.responseMode,
      "responseNode",
      `${wfFile} webhook must have responseMode: 'responseNode'`
    );

    // Verify emailSend node configuration
    const emailNode = content.nodes.find((n: { type: string }) => n.type === "n8n-nodes-base.emailSend");
    assert.ok(emailNode, `${wfFile} must have emailSend node`);
    assert.equal(
      emailNode.onError,
      "continueErrorOutput",
      `${wfFile} emailSend node must configure onError: continueErrorOutput`
    );
    assert.equal(
      emailNode.credentials?.smtp?.id,
      "lendloop-smtp-credential",
      `${wfFile} emailSend must reference 'lendloop-smtp-credential'`
    );

    // Verify emailSend connection branching (success to success-signing, error to failure-signing)
    const emailNodeName = emailNode.name;
    const connectionsFromEmail = content.connections[emailNodeName];
    assert.ok(connectionsFromEmail, `${wfFile} connections must exist for ${emailNodeName}`);
    assert.ok(
      connectionsFromEmail.main && connectionsFromEmail.main.length >= 2,
      `${wfFile} ${emailNodeName} must have at least 2 output branches (success and error)`
    );

    const successBranch = connectionsFromEmail.main[0];
    const failureBranch = connectionsFromEmail.main[1];
    assert.ok(successBranch && successBranch.length > 0, `${wfFile} must have success output branch`);
    assert.ok(failureBranch && failureBranch.length > 0, `${wfFile} must have failure output branch`);

    assert.match(
      successBranch[0].node,
      /Success/i,
      `${wfFile} branch 0 must route to Success write-back`
    );
    assert.match(
      failureBranch[0].node,
      /Failure/i,
      `${wfFile} branch 1 must route to Failure write-back`
    );

    // Verify httpRequest writeback has onError: continueRegularOutput and connects to Format Final Delivery Response
    const httpNode = content.nodes.find((n: { type: string }) => n.type === "n8n-nodes-base.httpRequest");
    assert.ok(httpNode, `${wfFile} must have httpRequest writeback node`);
    assert.equal(
      httpNode.onError,
      "continueRegularOutput",
      `${wfFile} httpRequest writeback must configure onError: continueRegularOutput`
    );

    const httpConnections = content.connections[httpNode.name];
    assert.ok(httpConnections?.main?.[0], `${wfFile} httpRequest must connect to downstream node`);
    assert.equal(
      httpConnections.main[0][0].node,
      "Format Final Delivery Response",
      `${wfFile} httpRequest must connect to 'Format Final Delivery Response'`
    );

    // Verify Format Final Delivery Response connects to Respond to Webhook
    const formatConnections = content.connections["Format Final Delivery Response"];
    assert.ok(formatConnections?.main?.[0], `${wfFile} Format Final Delivery Response must connect to downstream node`);
    assert.equal(
      formatConnections.main[0][0].node,
      "Respond to Webhook",
      `${wfFile} Format Final Delivery Response must connect to 'Respond to Webhook'`
    );

    // Verify Respond to Webhook uses $input.first().json directly
    const respondNode = content.nodes.find((n: { type: string }) => n.type === "n8n-nodes-base.respondToWebhook");
    assert.ok(respondNode, `${wfFile} must have respondToWebhook node`);
    assert.match(
      respondNode.parameters?.responseBody || "",
      /JSON\.stringify\(\$input\.first\(\)\.json\)/,
      `${wfFile} respondToWebhook must emit formatted response from upstream code node`
    );

    // Verify all code nodes configure mode: 'runOnceForAllItems'
    const codeNodes = content.nodes.filter((n: { type: string }) => n.type === "n8n-nodes-base.code");
    assert.ok(codeNodes.length >= 4, `${wfFile} must have at least 4 code nodes`);
    for (const cn of codeNodes) {
      assert.equal(
        cn.parameters?.mode,
        "runOnceForAllItems",
        `${wfFile} code node '${cn.name}' must have mode: 'runOnceForAllItems'`
      );
    }

    // Verify no placeholder signatures or passwords exist
    const rawContent = JSON.stringify(content);
    assert.equal(rawContent.includes("placeholder_signature"), false, `${wfFile} must not have fake signature`);
    assert.equal(rawContent.includes("sha256=automated_workflow_signature"), false, `${wfFile} must not have placeholder signature`);
    assert.equal(rawContent.includes("smtp_password"), false, `${wfFile} must not have raw smtp_password`);
    assert.equal(rawContent.includes("dev_hmac_secret"), false, `${wfFile} must not have dev_hmac_secret`);
  }
  console.log("✔ Test 9.1 Passed: All 4 n8n workflow JSON configurations verified with real SMTP credentials, error branching, runOnceForAllItems mode, and synchronous webhook acknowledgement.");

  // ===================================================================
  // 10. ADMIN AUTOMATION OVERVIEW
  // ===================================================================
  console.log("\n--- 10. Admin Automation Overview ---");

  {
    const overview = await asAdmin.query(api.admin.getAutomationOverview, {});
    assert.ok(overview, "Admin must be able to query automation overview");
    assert.ok(overview.counts.total > 0);

    // Ordinary user rejected
    await assert.rejects(
      async () => {
        await asBorrower.query(api.admin.getAutomationOverview, {});
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );
    console.log("✔ Test 10.1 Passed: Admin automation overview verified and protected.");
  }

  // ===================================================================
  // 11. DOCKER COMPOSE CONFIGURATION & SECURITY VALIDATION
  // ===================================================================
  console.log("\n--- 11. Docker Compose Configuration & Security Validation ---");

  {
    const dockerComposePath = path.resolve(process.cwd(), "docker-compose.yml");
    assert.ok(fs.existsSync(dockerComposePath), "docker-compose.yml must exist");

    const composeContent = fs.readFileSync(dockerComposePath, "utf-8");

    // 11.1 Port binding is restricted to loopback
    assert.match(composeContent, /"127\.0\.0\.1:5678:5678"/, "Port must be strictly bound to 127.0.0.1 loopback");

    // 11.2 Environment section is clean YAML mapping syntax (no list-style brackets or broken colons)
    assert.match(composeContent, /N8N_PORT:\s*"5678"/, "N8N_PORT must use YAML mapping syntax");
    assert.match(composeContent, /N8N_PROTOCOL:\s*"http"/, "N8N_PROTOCOL must use YAML mapping syntax");

    // 11.3 Mandatory HMAC secret without fallback
    assert.match(
      composeContent,
      /N8N_WEBHOOK_HMAC_SECRET:\s*"\$\{N8N_WEBHOOK_HMAC_SECRET:\?N8N_WEBHOOK_HMAC_SECRET must be set in \.env\}"/,
      "N8N_WEBHOOK_HMAC_SECRET must be mandatory with no fallback secret"
    );
    assert.equal(composeContent.includes("dev_hmac_secret"), false, "Must not contain dev_hmac_secret fallback");

    // 11.4 No fake SMTP passwords
    assert.equal(composeContent.includes("smtp_password"), false, "Must not contain fake smtp_password");
    assert.match(composeContent, /SMTP_PASSWORD:\s*"\$\{SMTP_PASSWORD:-\}"/);

    // 11.5 Permission enforcement
    assert.match(composeContent, /N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS:\s*"true"/);

    console.log("✔ Test 11.1 Passed: Docker Compose YAML configuration strictly verified for loopback binding, mapping syntax, and security.");
  }

  // ===================================================================
  // 12. ACTUAL EXECUTION OF N8N CODE NODE SCRIPTS (SANDBOXED RUNTIME TESTS)
  // ===================================================================
  console.log("\n--- 12. Actual Execution of n8n Code Node Scripts ---");

  interface WorkflowNode {
    name: string;
    type: string;
    parameters: {
      jsCode?: string;
      mode?: string;
      path?: string;
      responseMode?: string;
      responseBody?: string;
    };
    credentials?: { smtp?: { id: string; name: string } };
    onError?: string;
  }

  interface CodeNodeOutputItem {
    json: Record<string, unknown>;
  }

  {
    // Helper to run code node script in sandbox matching n8n runtime
    function runCodeNode(
      script: string,
      env: Record<string, string>,
      inputJson: Record<string, unknown>,
      nodeMocks: Record<string, unknown> = {}
    ): CodeNodeOutputItem[] {
      const $env = env;
      const $input = {
        first: () => ({ json: inputJson }),
        all: () => [{ json: inputJson }],
      };
      const $node: Record<string, { json: unknown }> = {};
      for (const [name, val] of Object.entries(nodeMocks)) {
        $node[name] = { json: val };
      }

      const fn = new Function("$env", "$input", "$node", "require", script);
      return fn($env, $input, $node, require) as CodeNodeOutputItem[];
    }

    const testSecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const wfAPath = path.resolve(process.cwd(), "n8n", "workflows", "workflow_a_request_created.json");
    const wfA = JSON.parse(fs.readFileSync(wfAPath, "utf-8")) as { nodes: WorkflowNode[] };

    // 12.1 HMAC Verification Code Node Execution with Authentic Signature
    const verifyNode = wfA.nodes.find((n: WorkflowNode) => n.name === "Verify HMAC & Extract Payload");
    assert.ok(verifyNode?.parameters.jsCode);
    const nowTs = Date.now();
    const eventBody = {
      eventId: "evt_test_123",
      eventType: "borrow_request.created",
      data: {
        requestId: "req_test_123",
        startDate: "2026-12-01",
        endDate: "2026-12-05",
        tool: { _id: "tool_123", name: "Cordless Drill" },
        lender: { _id: "lender_123", email: "lender@example.com", displayName: "Lender User" },
        borrower: { _id: "borrower_123", displayName: "Borrower User" },
      },
    };
    const rawBody = JSON.stringify(eventBody);
    const validSignature = crypto.createHmac("sha256", testSecret).update(`${nowTs}.${rawBody}`).digest("hex");

    const verifyOutput = runCodeNode(
      verifyNode.parameters.jsCode,
      { N8N_WEBHOOK_HMAC_SECRET: testSecret },
      {
        headers: {
          "x-lendloop-signature": `sha256=${validSignature}`,
          "x-lendloop-timestamp": nowTs.toString(),
        },
        rawBody,
        body: eventBody,
      }
    );

    assert.ok(Array.isArray(verifyOutput), "Verify node must return an array");
    assert.equal(verifyOutput.length, 1);
    assert.ok(verifyOutput[0].json, "Item must contain 'json' property");
    assert.equal(verifyOutput[0].json.requestId, "req_test_123");
    assert.equal(verifyOutput[0].json.lenderEmail, "lender@example.com");

    // 12.2 HMAC Verification Code Node Rejection with Tampered Signature
    assert.throws(
      () => {
        runCodeNode(
          verifyNode.parameters.jsCode!,
          { N8N_WEBHOOK_HMAC_SECRET: testSecret },
          {
            headers: {
              "x-lendloop-signature": `sha256=invalid${validSignature.slice(7)}`,
              "x-lendloop-timestamp": nowTs.toString(),
            },
            rawBody,
            body: eventBody,
          }
        );
      },
      /Unauthorized: HMAC signature mismatch/
    );

    // 12.3 Sign Success Write-Back Code Node Execution
    const signSuccessNode = wfA.nodes.find((n: WorkflowNode) => n.name === "Sign Success Write-Back");
    assert.ok(signSuccessNode?.parameters.jsCode);
    const signSuccessOutput = runCodeNode(
      signSuccessNode.parameters.jsCode,
      { N8N_WEBHOOK_HMAC_SECRET: testSecret },
      {},
      { "Verify HMAC & Extract Payload": verifyOutput[0].json }
    );
    assert.ok(Array.isArray(signSuccessOutput));
    assert.equal(signSuccessOutput[0].json.result, "sent");
    assert.match(signSuccessOutput[0].json.signature as string, /^sha256=[a-f0-9]{64}$/);

    // 12.4 Sign Failure Write-Back Code Node Execution
    const signFailureNode = wfA.nodes.find((n: WorkflowNode) => n.name === "Sign Failure Write-Back");
    assert.ok(signFailureNode?.parameters.jsCode);
    const signFailureOutput = runCodeNode(
      signFailureNode.parameters.jsCode,
      { N8N_WEBHOOK_HMAC_SECRET: testSecret },
      { error: { message: "SMTP connection refused" } },
      { "Verify HMAC & Extract Payload": verifyOutput[0].json }
    );
    assert.ok(Array.isArray(signFailureOutput));
    assert.equal(signFailureOutput[0].json.result, "failed");
    assert.match(signFailureOutput[0].json.summary as string, /SMTP provider delivery failed/);

    // 12.5 Format Final Delivery Response: Success branch
    const formatNode = wfA.nodes.find((n: WorkflowNode) => n.name === "Format Final Delivery Response");
    assert.ok(formatNode?.parameters.jsCode);
    const finalSuccess = runCodeNode(
      formatNode.parameters.jsCode,
      {},
      { success: true, activityId: "act_123" }, // Convex response
      { "Sign Success Write-Back": signSuccessOutput[0].json }
    );
    assert.ok(Array.isArray(finalSuccess));
    assert.equal(finalSuccess[0].json.delivered, true);
    assert.equal(finalSuccess[0].json.result, "sent");

    // 12.6 Format Final Delivery Response: Convex Activity Writeback failure prevents false delivery success
    const finalWritebackFailure = runCodeNode(
      formatNode.parameters.jsCode,
      {},
      { error: "Internal Server Error", status: 500 }, // Convex writeback failed
      { "Sign Success Write-Back": signSuccessOutput[0].json }
    );
    assert.ok(Array.isArray(finalWritebackFailure));
    assert.equal(finalWritebackFailure[0].json.delivered, false);
    assert.equal(finalWritebackFailure[0].json.result, "failed");
    assert.match(finalWritebackFailure[0].json.summary as string, /Convex activity writeback failed/);

    // 12.7 Format Final Delivery Response: SMTP failure branch
    const finalSmtpFailure = runCodeNode(
      formatNode.parameters.jsCode,
      {},
      { success: true, activityId: "act_123" },
      { "Sign Failure Write-Back": signFailureOutput[0].json }
    );
    assert.ok(Array.isArray(finalSmtpFailure));
    assert.equal(finalSmtpFailure[0].json.delivered, false);
    assert.equal(finalSmtpFailure[0].json.result, "failed");

    // 12.8 Every supported outbox event maps to a real workflow file endpoint
    const allWorkflowEndpoints = new Set<string>();
    const workflowFiles = [
      "workflow_a_request_created.json",
      "workflow_b_request_decision.json",
      "workflow_c_loan_returned.json",
      "workflow_d_overdue_reminder.json",
    ];
    for (const wf of workflowFiles) {
      const doc = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), "n8n", "workflows", wf), "utf-8")
      ) as { nodes: WorkflowNode[] };
      const wh = doc.nodes.find((n: WorkflowNode) => n.type === "n8n-nodes-base.webhook");
      if (wh?.parameters?.path) {
        allWorkflowEndpoints.add(wh.parameters.path);
      }
    }

    const { EVENT_ROUTE_PATHS } = await import("../convex/outbox");
    for (const [evtType, routePath] of Object.entries(EVENT_ROUTE_PATHS)) {
      assert.ok(
        allWorkflowEndpoints.has(routePath),
        `Event '${evtType}' route '${routePath}' must correspond to an active workflow webhook endpoint`
      );
    }
    assert.equal(
      allWorkflowEndpoints.has("lendloop-loan-created"),
      false,
      "No dangling lendloop-loan-created endpoint should exist"
    );

    console.log("✔ Test 12.1 Passed: All n8n Code node scripts executed in runtime sandbox, validating signature checking, signing, writeback failure protection, and endpoint routing.");
  }

  console.log("\n===================================================================");
  console.log("All Phase 7 Comprehensive Automation Tests Passed Successfully!");
  console.log("===================================================================\n");
});
