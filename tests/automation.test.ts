import { test } from "node:test";
import assert from "node:assert/strict";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  DEFAULT_TIMESTAMP_TOLERANCE_MS,
} from "../convex/webhookSecurity";

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

test("Phase 7: n8n Automation and Webhook Integration Test Suite", async () => {
  console.log("\n===================================================================");
  console.log("Running Phase 7 Automation, Outbox & Webhook Test Suite...");
  console.log("===================================================================\n");

  const t = convexTest(schema, modules);

  // -------------------------------------------------------------------
  // Setup Test Users and Tool
  // -------------------------------------------------------------------
  const lenderId: Id<"users"> = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkUserId: "clerk_lender_phase7",
      displayName: "Alice Lender",
      role: "user",
      isTrustedLender: true,
      createdAt: Date.now(),
    });
  });

  const borrowerId: Id<"users"> = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkUserId: "clerk_borrower_phase7",
      displayName: "Bob Borrower",
      role: "user",
      isTrustedLender: false,
      createdAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkUserId: "clerk_admin_phase7",
      displayName: "Admin Carol",
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

  // 1.2 Approving a borrow request atomically inserts 'borrow_request.approved' and 'loan.created'
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
    assert.ok(loanCreatedEvent, "Outbox must contain loan.created event");
    assert.equal(loanCreatedEvent?.loanId, loanId, "loan.created must reference loanId");
    console.log("✔ Test 1.2 Passed: borrow_request.approved & loan.created atomically emitted into outbox.");
  }

  // 1.3 Declining a borrow request atomically inserts 'borrow_request.declined'
  {
    // Create a second request to decline
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
  // 2. OUTBOX PROCESSING ENGINE: CLAIMING, RETRIES & EXPONENTIAL BACKOFF
  // ===================================================================
  console.log("\n--- 2. Outbox Claiming, Exponential Backoff & Stale Recovery ---");

  // 2.1 Claim eligible pending events
  let claimedEventId: Id<"automationOutbox">;
  {
    const claimedIds = await t.mutation(internal.outbox.claimEligibleEvents, {
      limit: 5,
    });

    assert.ok(claimedIds.length > 0, "Should claim pending events");
    claimedEventId = claimedIds[0];

    const claimedDoc = await t.run(async (ctx) => ctx.db.get(claimedEventId));
    assert.equal(claimedDoc?.status, "processing", "Claimed event status must transition to 'processing'");
    console.log("✔ Test 2.1 Passed: Pending events claimed and transitioned to 'processing'.");
  }

  // 2.2 Mark event failure and verify exponential backoff calculation
  {
    const errorMsg = "HTTP 500: n8n temporary network timeout";
    const failRes = await t.mutation(internal.outbox.markEventFailure, {
      outboxId: claimedEventId,
      errorMessage: errorMsg,
    });

    assert.ok(failRes);
    assert.equal(failRes.status, "pending", "Failed event with attempts < 5 must return to 'pending'");
    assert.equal(failRes.attempts, 1);
    assert.ok(failRes.nextRetryAt > Date.now(), "nextRetryAt must be in the future");

    const failedDoc = await t.run(async (ctx) => ctx.db.get(claimedEventId));
    assert.equal(failedDoc?.attempts, 1);
    assert.equal(failedDoc?.lastError, errorMsg);
    console.log("✔ Test 2.2 Passed: Event failure handled with exponential backoff retry.");
  }

  // 2.3 Terminal failure when max retry attempts reached
  {
    // Simulate attempts reaching 4
    await t.run(async (ctx) => {
      await ctx.db.patch(claimedEventId, { attempts: 4 });
    });

    const fatalRes = await t.mutation(internal.outbox.markEventFailure, {
      outboxId: claimedEventId,
      errorMessage: "Persistent failure",
    });

    assert.ok(fatalRes);
    assert.equal(fatalRes.status, "failed", "Event reaching max attempts must be marked 'failed'");
    assert.equal(fatalRes.attempts, 5);
    console.log("✔ Test 2.3 Passed: Terminal failure transitions event to 'failed' status.");
  }

  // 2.4 Stale processing recovery
  {
    // Create an event stuck in 'processing' for 10 minutes
    const staleOutboxId = await t.run(async (ctx) => {
      return await ctx.db.insert("automationOutbox", {
        eventId: "test_stale_event_uuid",
        eventType: "borrow_request.created",
        requestId,
        status: "processing",
        attempts: 1,
        nextRetryAt: 0,
        createdAt: Date.now() - 10 * 60 * 1000,
      });
    });

    // Run claimEligibleEvents
    const newlyClaimed = await t.mutation(internal.outbox.claimEligibleEvents, {
      limit: 10,
    });

    assert.ok(
      newlyClaimed.includes(staleOutboxId),
      "Stale processing event must be reclaimed by claimEligibleEvents"
    );
    console.log("✔ Test 2.4 Passed: Stale processing event successfully recovered.");
  }

  // ===================================================================
  // 3. HMAC-SHA256 WEBHOOK SECURITY VERIFICATION
  // ===================================================================
  console.log("\n--- 3. HMAC-SHA256 Security & Replay Prevention ---");

  const secret = "test_super_secret_webhook_key_12345";
  const payload = JSON.stringify({
    eventType: "borrow_request.created",
    requestId: "req_12345",
    data: { amount: 100 },
  });
  const now = Date.now();

  // 3.1 Valid signature and fresh timestamp
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
    console.log("✔ Test 3.1 Passed: Valid HMAC-SHA256 signature accepted.");
  }

  // 3.2 Tampered payload rejected
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
    console.log("✔ Test 3.2 Passed: Tampered payload rejected.");
  }

  // 3.3 Expired timestamp rejected (> tolerance)
  {
    const expiredTimestamp = now - (DEFAULT_TIMESTAMP_TOLERANCE_MS + 10000); // 5 min 10 sec ago
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
    console.log("✔ Test 3.3 Passed: Replay attack with expired timestamp rejected.");
  }

  // 3.4 Missing headers rejected
  {
    const missingSig = await verifyWebhookSignature({
      payload,
      signatureHeader: null,
      timestampHeader: now.toString(),
      secret,
    });
    assert.equal(missingSig.isValid, false);
    assert.match(missingSig.error || "", /Missing signature/);

    const missingTs = await verifyWebhookSignature({
      payload,
      signatureHeader: "sha256=abcdef",
      timestampHeader: null,
      secret,
    });
    assert.equal(missingTs.isValid, false);
    assert.match(missingTs.error || "", /Missing timestamp/);
    console.log("✔ Test 3.4 Passed: Missing headers rejected.");
  }

  // ===================================================================
  // 4. IDEMPOTENT AUTOMATION ACTIVITY WRITE-BACK
  // ===================================================================
  console.log("\n--- 4. Idempotent Automation Activity Write-Back ---");

  const testKey = `test_idempotency_key_${Date.now()}`;

  // 4.1 First activity write succeeds
  {
    const res1 = await t.mutation(internal.outbox.recordActivityInternal, {
      idempotencyKey: testKey,
      requestId,
      loanId,
      eventType: "borrow_request.created",
      recipientUserId: lenderId,
      result: "sent",
      summary: "Notification delivered to lender",
    });

    assert.equal(res1.success, true);
    assert.equal(res1.duplicate, false);
    assert.ok(res1.activityId);
    console.log("✔ Test 4.1 Passed: Initial activity written to automationActivity.");
  }

  // 4.2 Duplicate activity write with same key is deduplicated
  {
    const res2 = await t.mutation(internal.outbox.recordActivityInternal, {
      idempotencyKey: testKey,
      requestId,
      loanId,
      eventType: "borrow_request.created",
      recipientUserId: lenderId,
      result: "sent",
      summary: "Duplicate attempt",
    });

    assert.equal(res2.success, true);
    assert.equal(res2.duplicate, true, "Must flag duplicate: true");

    // Verify exactly one record exists in table for this key
    const records = await t.run(async (ctx) => {
      return await ctx.db
        .query("automationActivity")
        .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", testKey))
        .collect();
    });

    assert.equal(records.length, 1, "Exactly one activity record must exist in DB");
    console.log("✔ Test 4.2 Passed: Duplicate write-back safely deduplicated (idempotent).");
  }

  // ===================================================================
  // 5. OVERDUE LOAN DETECTION & REMINDER DEDUPLICATION
  // ===================================================================
  console.log("\n--- 5. Overdue Loan Detection & Reminder Deduplication ---");

  // Create an active overdue loan
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
        dueDate: "2026-10-10", // Past due date
        status: "active",
        createdAt: Date.now(),
      });
    });

    // Query active overdue loans
    const overdueList = await t.query(internal.outbox.getActiveOverdueLoans, {});
    const found = overdueList.find((l) => l._id === overdueLoanId);
    assert.ok(found, "Overdue active loan must be found by getActiveOverdueLoans");
    console.log("✔ Test 5.1 Passed: Overdue active loans correctly identified.");
  }

  // 5.2 Remind overdue loans and test same-day deduplication
  {
    const run1 = await t.action(internal.outbox.scanOverdueLoansAndRemind, {});
    assert.ok(run1.remindersSent >= 1, "Must send at least 1 reminder");

    // Run a second time immediately on the same date
    const run2 = await t.action(internal.outbox.scanOverdueLoansAndRemind, {});
    assert.ok(run2.alreadyReminded >= 1, "Second run must detect already reminded loan");
    assert.equal(run2.remindersSent, 0, "No duplicate reminders sent on same day");
    console.log("✔ Test 5.2 Passed: Daily overdue loan reminder deduplicated per loan per day.");
  }

  // ===================================================================
  // 6. ADMIN AUTOMATION DASHBOARD OVERVIEW QUERY
  // ===================================================================
  console.log("\n--- 6. Admin Automation Overview Visibility ---");

  {
    const overview = await asAdmin.query(api.admin.getAutomationOverview, {});
    assert.ok(overview, "Admin must be able to query automation overview");
    assert.ok(overview.counts.total > 0, "Counts total must be > 0");
    assert.ok(overview.recentActivities.length > 0, "Recent activities must be populated");
    console.log("✔ Test 6.1 Passed: Administrator can query automation overview metrics and activity stream.");

    // Unauthorized non-admin rejected
    await assert.rejects(
      async () => {
        await asBorrower.query(api.admin.getAutomationOverview, {});
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );
    console.log("✔ Test 6.2 Passed: Ordinary user cannot query admin automation overview.");
  }

  console.log("\n===================================================================");
  console.log("All Phase 7 Automation, Outbox & Webhook Tests Passed Successfully!");
  console.log("===================================================================\n");
});
