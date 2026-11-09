/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { isOverdue, doIntervalsOverlap } from "../convex/dateUtils";

console.log("===================================================================");
console.log("Running Phase 6 Real Convex Function Security Test Suite...");
console.log("===================================================================\n");

const modules = {
  "../convex/_generated/api.js": () => import("../convex/_generated/api.js"),
  "../convex/admin.ts": () => import("../convex/admin"),
  "../convex/users.ts": () => import("../convex/users"),
  "../convex/tools.ts": () => import("../convex/tools"),
  "../convex/loans.ts": () => import("../convex/loans"),
  "../convex/borrowRequests.ts": () => import("../convex/borrowRequests"),
  "../convex/authHelpers.ts": () => import("../convex/authHelpers"),
  "../convex/dateUtils.ts": () => import("../convex/dateUtils"),
};

async function runRealConvexSecurityTests() {
  const t = convexTest(schema, modules);

  // Setup initial test users via real `api.users.storeUser`
  const asAlice = t.withIdentity({
    subject: "clerk_user_alice_test",
    name: "Alice Cooper",
    email: "alice@example.com",
  });
  const aliceDoc = await asAlice.mutation(api.users.storeUser);
  assert.ok(aliceDoc, "Alice must be provisioned");
  assert.equal(aliceDoc.role, "user", "Newly provisioned user role must strictly default to 'user'");
  assert.equal(aliceDoc.isTrustedLender, false, "Newly provisioned user must not be trusted lender");

  const asBob = t.withIdentity({
    subject: "clerk_user_bob_test",
    name: "Bob Builder",
    email: "bob@example.com",
  });
  const bobDoc = await asBob.mutation(api.users.storeUser);
  assert.ok(bobDoc, "Bob must be provisioned");
  assert.equal(bobDoc.role, "user", "Newly provisioned user role must strictly default to 'user'");

  const asCharlie = t.withIdentity({
    subject: "clerk_user_charlie_test",
    name: "Charlie Brown",
    email: "charlie@example.com",
  });
  const charlieDoc = await asCharlie.mutation(api.users.storeUser);
  assert.ok(charlieDoc, "Charlie must be provisioned");

  // ===================================================================
  // 1. ADMIN INITIALIZATION TESTS (Real internal.users.bootstrapAdmin)
  // ===================================================================
  console.log("--- 1. Admin Initialization Security Tests ---");

  // 1.1 First administrator initialization when no admin exists
  {
    const res = await t.mutation(internal.users.bootstrapAdmin, {
      clerkUserId: "clerk_user_alice_test",
    });
    assert.equal(res.success, true);
    assert.equal(res.role, "admin");

    const updatedAlice: any = await t.run(async (ctx) => ctx.db.get(aliceDoc._id));
    assert.equal(updatedAlice?.role, "admin", "Alice must now have 'admin' role in the database");
    console.log("✔ Test 1.1 Passed: First administrator successfully initialized via internal.users.bootstrapAdmin.");
  }

  // 1.2 Ordinary user cannot self-promote once an admin exists
  {
    await assert.rejects(
      async () => {
        await asBob.mutation(internal.users.bootstrapAdmin, {
          clerkUserId: "clerk_user_bob_test",
        });
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      },
      "Ordinary user must be forbidden from elevating themselves"
    );

    const bobInDb: any = await t.run(async (ctx) => ctx.db.get(bobDoc._id));
    assert.equal(bobInDb?.role, "user", "Bob's role must remain 'user'");
    console.log("✔ Test 1.2 Passed: Ordinary user cannot self-promote via bootstrapAdmin.");
  }

  // 1.3 Unauthenticated caller cannot run bootstrap once an admin exists
  {
    await assert.rejects(
      async () => {
        await t.mutation(internal.users.bootstrapAdmin, {
          clerkUserId: "clerk_user_bob_test",
        });
      },
      (err: Error) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test 1.3 Passed: Unauthenticated request to bootstrapAdmin is rejected.");
  }

  // 1.4 Authenticated administrator CAN promote another user
  {
    const res = await asAlice.mutation(internal.users.bootstrapAdmin, {
      clerkUserId: "clerk_user_charlie_test",
    });
    assert.equal(res.success, true);

    const charlieInDb: any = await t.run(async (ctx) => ctx.db.get(charlieDoc._id));
    assert.equal(charlieInDb?.role, "admin", "Charlie must be promoted to admin by Alice");
    console.log("✔ Test 1.4 Passed: Existing authenticated admin can promote another user.");

    // Demote Charlie back to user for subsequent tests
    await t.run(async (ctx) => ctx.db.patch(charlieDoc._id, { role: "user" }));
  }

  // ===================================================================
  // 2. TRUSTED LENDER MANAGEMENT (Real api.admin.setTrustedLender)
  // ===================================================================
  console.log("\n--- 2. Trusted Lender Management Tests ---");

  // 2.1 Actual mutation succeeds for an administrator
  {
    const res = await asAlice.mutation(api.admin.setTrustedLender, {
      userId: bobDoc._id,
      isTrusted: true,
    });
    assert.equal(res.success, true);
    assert.equal(res.isTrustedLender, true);

    const bobInDb: any = await t.run(async (ctx) => ctx.db.get(bobDoc._id));
    assert.equal(bobInDb?.isTrustedLender, true, "Database value for isTrustedLender must be true");
    console.log("✔ Test 2.1 Passed: Administrator successfully granted Trusted Lender status (verified in DB).");
  }

  // 2.2 Actual mutation revokes status for an administrator
  {
    const res = await asAlice.mutation(api.admin.setTrustedLender, {
      userId: bobDoc._id,
      isTrusted: false,
    });
    assert.equal(res.success, true);
    assert.equal(res.isTrustedLender, false);

    const bobInDb: any = await t.run(async (ctx) => ctx.db.get(bobDoc._id));
    assert.equal(bobInDb?.isTrustedLender, false, "Database value for isTrustedLender must be false");
    console.log("✔ Test 2.2 Passed: Administrator successfully revoked Trusted Lender status (verified in DB).");
  }

  // 2.3 Actual mutation rejects an ordinary user
  {
    await assert.rejects(
      async () => {
        await asBob.mutation(api.admin.setTrustedLender, {
          userId: bobDoc._id,
          isTrusted: true,
        });
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );

    const bobInDb: any = await t.run(async (ctx) => ctx.db.get(bobDoc._id));
    assert.equal(bobInDb?.isTrustedLender, false, "Database value must remain unchanged");
    console.log("✔ Test 2.3 Passed: Ordinary user is rejected when attempting to modify Trusted Lender status.");
  }

  // 2.4 Actual mutation rejects unauthenticated caller
  {
    await assert.rejects(
      async () => {
        await t.mutation(api.admin.setTrustedLender, {
          userId: bobDoc._id,
          isTrusted: true,
        });
      },
      (err: Error) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test 2.4 Passed: Unauthenticated request to setTrustedLender is rejected.");
  }

  // ===================================================================
  // 3. PLATFORM-WIDE LOANS (Real api.admin.listAllLoans)
  // ===================================================================
  console.log("\n--- 3. Platform-Wide Loan Visibility Tests ---");

  // Create seed tools and loans using real Convex functions
  const aliceToolId = await asAlice.mutation(api.tools.createTool, {
    name: "Cordless Hammer Drill",
    category: "Power Tools",
    condition: "Excellent",
    description: "Brushless 18V cordless hammer drill.",
  });

  const reqId = await asBob.mutation(api.borrowRequests.createRequest, {
    toolId: aliceToolId,
    startDate: "2026-11-20",
    endDate: "2026-11-25",
  });

  const approveRes = await asAlice.mutation(api.borrowRequests.approveRequest, {
    requestId: reqId,
  });
  const loanId = approveRes.loanId;
  assert.ok(loanId, "Loan must be generated on approval");

  // 3.1 Actual admin.listAllLoans returns platform-wide results to an administrator
  {
    const allLoans = await asAlice.query(api.admin.listAllLoans, {});
    assert.equal(allLoans.length, 1, "Admin query must return the active loan");
    assert.equal(allLoans[0]._id, loanId);
    assert.equal(allLoans[0].tool?.name, "Cordless Hammer Drill");
    assert.equal(allLoans[0].lender?.displayName, "Alice Cooper");
    assert.equal(allLoans[0].borrower?.displayName, "Bob Builder");
    console.log("✔ Test 3.1 Passed: Actual admin.listAllLoans returns platform loans with enriched participant & tool data.");
  }

  // 3.2 Actual query rejects an ordinary user
  {
    await assert.rejects(
      async () => {
        await asBob.query(api.admin.listAllLoans, {});
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );
    console.log("✔ Test 3.2 Passed: Actual admin.listAllLoans rejects ordinary user.");
  }

  // 3.3 Actual query rejects unauthenticated caller
  {
    await assert.rejects(
      async () => {
        await t.query(api.admin.listAllLoans, {});
      },
      (err: Error) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test 3.3 Passed: Actual admin.listAllLoans rejects unauthenticated caller.");
  }

  // ===================================================================
  // 4. TOOL MODERATION (Real api.admin.deactivateToolAdmin & reactivate)
  // ===================================================================
  console.log("\n--- 4. Tool Moderation Security Tests ---");

  const bobToolId = await asBob.mutation(api.tools.createTool, {
    name: "Electric Pressure Washer",
    category: "Cleaning",
    condition: "Good",
    description: "2000 PSI high pressure washer.",
  });

  // 4.1 Actual admin.deactivateToolAdmin allows administrator to deactivate Bob's tool
  {
    const res = await asAlice.mutation(api.admin.deactivateToolAdmin, {
      toolId: bobToolId,
    });
    assert.equal(res.success, true);
    assert.equal(res.isActive, false);

    const toolInDb: any = await t.run(async (ctx) => ctx.db.get(bobToolId));
    assert.equal(toolInDb?.isActive, false, "Tool in DB must have isActive = false");
    console.log("✔ Test 4.1 Passed: Administrator soft-deactivates another member's tool (verified in DB).");
  }

  // 4.2 Actual mutation rejects an ordinary user
  {
    await assert.rejects(
      async () => {
        // Bob attempts to use admin deactivation on Alice's tool
        await asBob.mutation(api.admin.deactivateToolAdmin, {
          toolId: aliceToolId,
        });
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );

    const aliceToolInDb: any = await t.run(async (ctx) => ctx.db.get(aliceToolId));
    assert.equal(aliceToolInDb?.isActive, true, "Alice's tool must remain active");
    console.log("✔ Test 4.2 Passed: Ordinary user cannot use admin deactivation on another member's tool.");
  }

  // 4.3 Actual mutation rejects unauthenticated caller
  {
    await assert.rejects(
      async () => {
        await t.mutation(api.admin.deactivateToolAdmin, {
          toolId: bobToolId,
        });
      },
      (err: Error) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test 4.3 Passed: Unauthenticated request to deactivateToolAdmin is rejected.");
  }

  // 4.4 Actual admin.reactivateToolAdmin restores the listing
  {
    const res = await asAlice.mutation(api.admin.reactivateToolAdmin, {
      toolId: bobToolId,
    });
    assert.equal(res.success, true);
    assert.equal(res.isActive, true);

    const toolInDb: any = await t.run(async (ctx) => ctx.db.get(bobToolId));
    assert.equal(toolInDb?.isActive, true, "Tool in DB must have isActive = true");
    console.log("✔ Test 4.4 Passed: Administrator successfully restored deactivated listing (verified in DB).");
  }

  // 4.5 Verify historical loan records remain intact when tool is deactivated
  {
    // Deactivate Alice's tool which has an active loan
    await asAlice.mutation(api.admin.deactivateToolAdmin, {
      toolId: aliceToolId,
    });

    const loanInDb: any = await t.run(async (ctx) => ctx.db.get(loanId));
    assert.ok(loanInDb, "Loan record must not be deleted when tool is deactivated");
    assert.equal(loanInDb?.status, "active", "Loan status must remain intact");
    console.log("✔ Test 4.5 Passed: Tool deactivation preserves historical loan records and integrity.");
  }

  // ===================================================================
  // 5. PLATFORM STATS AND USER REGISTRY TESTS
  // ===================================================================
  console.log("\n--- 5. Platform Stats and User Registry Tests ---");

  // 5.1 Actual admin.getPlatformStats returns aggregates to admin
  {
    const stats = await asAlice.query(api.admin.getPlatformStats, {});
    assert.equal(stats.totalUsers, 3);
    assert.equal(stats.totalTools, 2);
    assert.equal(stats.totalLoans, 1);
    assert.equal(stats.activeLoansCount, 1);
    console.log("✔ Test 5.1 Passed: Actual admin.getPlatformStats returns verified platform-wide aggregates to admin.");
  }

  // 5.2 Actual admin.getPlatformStats rejects unauthorized callers
  {
    await assert.rejects(
      async () => {
        await asBob.query(api.admin.getPlatformStats, {});
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await t.query(api.admin.getPlatformStats, {});
      },
      (err: Error) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test 5.2 Passed: Actual admin.getPlatformStats rejects ordinary user and unauthenticated caller.");
  }

  // 5.3 Actual admin.listUsers returns member registry to admin
  {
    const users = await asAlice.query(api.admin.listUsers, {});
    assert.equal(users.length, 3);
    console.log("✔ Test 5.3 Passed: Actual admin.listUsers returns full user registry to admin.");
  }

  // 5.4 Actual admin.listUsers rejects unauthorized callers
  {
    await assert.rejects(
      async () => {
        await asBob.query(api.admin.listUsers, {});
      },
      (err: Error) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await t.query(api.admin.listUsers, {});
      },
      (err: Error) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test 5.4 Passed: Actual admin.listUsers rejects ordinary user and unauthenticated caller.");
  }

  // ===================================================================
  // 6. REGRESSION TESTS (Loan Return & Overdue Interval)
  // ===================================================================
  console.log("\n--- 6. Regression Tests ---");

  // 6.1 Loan return confirmation works on real loan
  {
    const returnRes = await asBob.mutation(api.loans.markReturned, {
      loanId,
    });
    assert.equal(returnRes.success, true);

    const returnedLoan: any = await t.run(async (ctx) => ctx.db.get(loanId));
    assert.equal(returnedLoan?.status, "returned");
    assert.ok(returnedLoan?.returnedAt, "returnedAt timestamp must be recorded");
    console.log("✔ Test 6.1 Passed: Real loan marked as returned and verified in database.");
  }

  // 6.2 Overdue interval logic verified
  {
    assert.equal(isOverdue("2026-11-05", "2026-11-05"), true, "Boundary dueDate must be overdue");
    assert.equal(isOverdue("2026-11-04", "2026-11-05"), true, "Past dueDate must be overdue");
    assert.equal(isOverdue("2026-11-06", "2026-11-05"), false, "Future dueDate must not be overdue");
    assert.equal(doIntervalsOverlap("2026-11-10", "2026-11-15", "2026-11-15", "2026-11-20"), false);
    console.log("✔ Test 6.2 Passed: Loan overdue boundary and interval overlap regression tests pass.");
  }

  console.log("\n===================================================================");
  console.log("All 22 Real Convex Function Security & Regression Tests Passed!");
  console.log("===================================================================");
}

runRealConvexSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
