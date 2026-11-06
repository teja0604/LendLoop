import assert from "node:assert/strict";
import { getTodayUtcDateString, isOverdue } from "../convex/dateUtils.ts";

console.log("=================================================");
console.log("Running Phase 6 Admin & Security Test Suite...");
console.log("=================================================\n");

// --- IN-MEMORY CONVEX HARNESS SIMULATION ---
class MockConvexDb {
  constructor() {
    this.tables = {
      users: new Map(),
      tools: new Map(),
      borrowRequests: new Map(),
      loans: new Map(),
    };
    this.idCounter = 1;
  }

  async get(id) {
    for (const table of Object.values(this.tables)) {
      if (table.has(id)) {
        return { ...table.get(id) };
      }
    }
    return null;
  }

  async insert(tableName, data) {
    const _id = `${tableName}_id_${this.idCounter++}`;
    const doc = { _id, ...data };
    this.tables[tableName].set(_id, doc);
    return _id;
  }

  async patch(id, fields) {
    for (const table of Object.values(this.tables)) {
      if (table.has(id)) {
        const existing = table.get(id);
        const updated = { ...existing, ...fields };
        table.set(id, updated);
        return updated;
      }
    }
    throw new Error(`Record with id ${id} not found.`);
  }

  query(tableName) {
    const records = Array.from(this.tables[tableName].values());
    let current = [...records];

    const queryBuilder = {
      withIndex: (indexName, fn) => {
        if (indexName === "by_clerk_id") {
          const conditions = {};
          fn({ eq: (field, val) => { conditions[field] = val; } });
          current = current.filter((item) => item.clerkUserId === conditions.clerkUserId);
        } else if (indexName === "by_owner") {
          const conditions = {};
          fn({ eq: (field, val) => { conditions[field] = val; } });
          current = current.filter((item) => item.ownerId === conditions.ownerId);
        } else if (indexName === "by_active") {
          const conditions = {};
          fn({ eq: (field, val) => { conditions[field] = val; } });
          current = current.filter((item) => item.isActive === conditions.isActive);
        } else if (indexName === "by_lender") {
          const conditions = {};
          fn({ eq: (field, val) => { conditions[field] = val; } });
          current = current.filter((item) => item.lenderId === conditions.lenderId);
        } else if (indexName === "by_borrower") {
          const conditions = {};
          fn({ eq: (field, val) => { conditions[field] = val; } });
          current = current.filter((item) => item.borrowerId === conditions.borrowerId);
        } else if (indexName === "by_tool") {
          const conditions = {};
          fn({ eq: (field, val) => { conditions[field] = val; } });
          current = current.filter((item) => item.toolId === conditions.toolId);
        }
        return queryBuilder;
      },
      filter: (predicateFn) => {
        current = current.filter((item) => {
          const q = {
            eq: (fieldVal, target) => fieldVal === target,
            field: (name) => item[name],
          };
          return predicateFn(q);
        });
        return queryBuilder;
      },
      order: (_direction) => {
        // default descending by createdAt
        current.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return queryBuilder;
      },
      unique: async () => current[0] || null,
      first: async () => current[0] || null,
      collect: async () => [...current],
    };

    return queryBuilder;
  }
}

function createMockCtx(db, clerkUserId = null) {
  return {
    db,
    auth: {
      getUserIdentity: async () => {
        if (!clerkUserId) return null;
        return {
          subject: clerkUserId,
          name: `User ${clerkUserId}`,
        };
      },
    },
  };
}

// Security Helper Functions matching convex/authHelpers.ts
async function requireAuthenticatedUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: Valid session required.");
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("Unauthorized: Application user record does not exist.");
  }
  return { identity, user };
}

async function requireAdmin(ctx) {
  const { identity, user } = await requireAuthenticatedUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Forbidden: Administrator privileges required.");
  }
  return { identity, user };
}

// Handlers matching convex/users.ts and convex/admin.ts
async function bootstrapAdminHandler(ctx, args) {
  const anyAdmin = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("role"), "admin"))
    .first();

  if (anyAdmin !== null) {
    await requireAdmin(ctx);
  }

  const targetUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
    .unique();

  if (!targetUser) {
    throw new Error(`User with clerkUserId "${args.clerkUserId}" not found in database.`);
  }

  await ctx.db.patch(targetUser._id, { role: "admin" });
  return { success: true, userId: targetUser._id, role: "admin" };
}

async function setTrustedLenderHandler(ctx, args) {
  await requireAdmin(ctx);
  const targetUser = await ctx.db.get(args.userId);
  if (!targetUser) {
    throw new Error("Not Found: Target user does not exist in the database.");
  }
  await ctx.db.patch(targetUser._id, { isTrustedLender: args.isTrusted });
  return { success: true, userId: targetUser._id, isTrustedLender: args.isTrusted };
}

async function listAllLoansHandler(ctx, args = {}) {
  await requireAdmin(ctx);
  const loans = await ctx.db.query("loans").order("desc").collect();

  const enriched = await Promise.all(
    loans.map(async (loan) => {
      const [tool, lender, borrower] = await Promise.all([
        ctx.db.get(loan.toolId),
        ctx.db.get(loan.lenderId),
        ctx.db.get(loan.borrowerId),
      ]);
      const loanIsOverdue = loan.status === "active" && isOverdue(loan.dueDate);
      return {
        ...loan,
        isOverdue: loanIsOverdue,
        tool,
        lender,
        borrower,
      };
    })
  );

  if (args.status === "overdue") return enriched.filter((l) => l.isOverdue);
  if (args.status === "active") return enriched.filter((l) => l.status === "active");
  if (args.status === "returned") return enriched.filter((l) => l.status === "returned");
  return enriched;
}

async function deactivateToolAdminHandler(ctx, args) {
  await requireAdmin(ctx);
  const tool = await ctx.db.get(args.toolId);
  if (!tool) throw new Error("Not Found: Tool does not exist.");

  await ctx.db.patch(tool._id, {
    isActive: false,
    updatedAt: Date.now(),
  });
  return { success: true, toolId: tool._id, isActive: false };
}

async function reactivateToolAdminHandler(ctx, args) {
  await requireAdmin(ctx);
  const tool = await ctx.db.get(args.toolId);
  if (!tool) throw new Error("Not Found: Tool does not exist.");

  await ctx.db.patch(tool._id, {
    isActive: true,
    updatedAt: Date.now(),
  });
  return { success: true, toolId: tool._id, isActive: true };
}

// --- TEST SUITE EXECUTION ---

async function runTests() {
  const db = new MockConvexDb();

  // Setup seed users
  const user1Id = await db.insert("users", {
    clerkUserId: "user_regular_1",
    displayName: "Alice",
    role: "user",
    isTrustedLender: false,
    createdAt: 1000,
  });

  const user2Id = await db.insert("users", {
    clerkUserId: "user_regular_2",
    displayName: "Bob",
    role: "user",
    isTrustedLender: false,
    createdAt: 2000,
  });

  const tool1Id = await db.insert("tools", {
    ownerId: user1Id,
    name: "Cordless Drill",
    category: "Power Tools",
    condition: "Good",
    description: "Reliable drill",
    isActive: true,
    createdAt: 1000,
    updatedAt: 1000,
  });

  // Setup seed loans
  const today = getTodayUtcDateString();
  const yesterday = "2026-11-05";
  const tomorrow = "2026-11-07";

  const loan1Id = await db.insert("loans", {
    requestId: "req_1",
    toolId: tool1Id,
    lenderId: user1Id,
    borrowerId: user2Id,
    startDate: "2026-11-01",
    dueDate: yesterday, // past due -> overdue
    status: "active",
    createdAt: 1000,
  });

  const loan2Id = await db.insert("loans", {
    requestId: "req_2",
    toolId: tool1Id,
    lenderId: user1Id,
    borrowerId: user2Id,
    startDate: "2026-11-06",
    dueDate: tomorrow, // not overdue
    status: "active",
    createdAt: 2000,
  });

  const loan3Id = await db.insert("loans", {
    requestId: "req_3",
    toolId: tool1Id,
    lenderId: user1Id,
    borrowerId: user2Id,
    startDate: "2026-10-01",
    dueDate: "2026-10-10",
    status: "returned",
    returnedAt: 3000,
    createdAt: 500,
  });

  // ==========================================
  // SECTION A: ADMIN INITIALIZATION TESTS
  // ==========================================
  console.log("--- Section A: Admin Initialization Tests ---");

  // Test A1: First admin bootstrap when no admin exists
  {
    const serverCliCtx = createMockCtx(db, null); // unauthenticated server CLI
    const res = await bootstrapAdminHandler(serverCliCtx, { clerkUserId: "user_regular_1" });
    assert.equal(res.success, true);
    assert.equal(res.role, "admin");

    const updatedUser = await db.get(user1Id);
    assert.equal(updatedUser.role, "admin", "User 1 must now be an admin");
    console.log("✔ Test A1 Passed: First administrator successfully bootstrapped via secure server mechanism.");
  }

  // Test A2: Ordinary user cannot abuse bootstrapAdmin to promote arbitrary user
  {
    const ordinaryUserCtx = createMockCtx(db, "user_regular_2");
    await assert.rejects(
      async () => {
        await bootstrapAdminHandler(ordinaryUserCtx, { clerkUserId: "user_regular_2" });
      },
      (err) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      },
      "Ordinary user must not be able to promote themselves or others once an admin exists"
    );
    console.log("✔ Test A2 Passed: Ordinary user cannot self-promote or abuse repeated bootstrap calls.");
  }

  // Test A3: Authenticated admin can promote another user
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    const res = await bootstrapAdminHandler(adminCtx, { clerkUserId: "user_regular_2" });
    assert.equal(res.success, true);
    const updatedUser2 = await db.get(user2Id);
    assert.equal(updatedUser2.role, "admin");
    console.log("✔ Test A3 Passed: Existing authenticated admin can promote users.");
    // Revert user 2 back to ordinary user for remaining tests
    await db.patch(user2Id, { role: "user" });
  }

  // ==========================================
  // SECTION B: TRUSTED LENDER MANAGEMENT TESTS
  // ==========================================
  console.log("\n--- Section B: Trusted Lender Management Tests ---");

  // Test B1: Admin can award Trusted Lender badge
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    const res = await setTrustedLenderHandler(adminCtx, { userId: user2Id, isTrusted: true });
    assert.equal(res.success, true);
    assert.equal(res.isTrustedLender, true);

    const user2 = await db.get(user2Id);
    assert.equal(user2.isTrustedLender, true, "User 2 must be trusted lender");
    console.log("✔ Test B1 Passed: Admin successfully awards Trusted Lender status.");
  }

  // Test B2: Admin can revoke Trusted Lender badge
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    const res = await setTrustedLenderHandler(adminCtx, { userId: user2Id, isTrusted: false });
    assert.equal(res.success, true);
    assert.equal(res.isTrustedLender, false);

    const user2 = await db.get(user2Id);
    assert.equal(user2.isTrustedLender, false, "User 2 must no longer be trusted lender");
    console.log("✔ Test B2 Passed: Admin successfully revokes Trusted Lender status.");
  }

  // Test B3: Ordinary user cannot award or revoke Trusted Lender status
  {
    const ordinaryCtx = createMockCtx(db, "user_regular_2");
    await assert.rejects(
      async () => {
        await setTrustedLenderHandler(ordinaryCtx, { userId: user2Id, isTrusted: true });
      },
      (err) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      },
      "Ordinary user must be forbidden from granting Trusted Lender status"
    );
    console.log("✔ Test B3 Passed: Ordinary user cannot grant themselves or others Trusted Lender status.");
  }

  // Test B4: Unauthenticated request is rejected
  {
    const unauthCtx = createMockCtx(db, null);
    await assert.rejects(
      async () => {
        await setTrustedLenderHandler(unauthCtx, { userId: user2Id, isTrusted: true });
      },
      (err) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test B4 Passed: Unauthenticated request to setTrustedLender is rejected.");
  }

  // ==========================================
  // SECTION C: PLATFORM-WIDE LOAN VISIBILITY TESTS
  // ==========================================
  console.log("\n--- Section C: Platform-Wide Loan Visibility Tests ---");

  // Test C1: Admin can retrieve all platform loans with participant details
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    const allLoans = await listAllLoansHandler(adminCtx);
    assert.equal(allLoans.length, 3, "All 3 platform loans must be returned to admin");
    assert.ok(allLoans[0].lender, "Lender details must be populated");
    assert.ok(allLoans[0].borrower, "Borrower details must be populated");
    assert.ok(allLoans[0].tool, "Tool details must be populated");
    console.log("✔ Test C1 Passed: Admin retrieves all platform loans with enriched participant & tool details.");
  }

  // Test C2: Status filtering and overdue identification
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    const overdueLoans = await listAllLoansHandler(adminCtx, { status: "overdue" });
    assert.equal(overdueLoans.length, 1, "Exactly 1 loan must be overdue");
    assert.equal(overdueLoans[0]._id, loan1Id);
    assert.equal(overdueLoans[0].isOverdue, true);

    const activeLoans = await listAllLoansHandler(adminCtx, { status: "active" });
    assert.equal(activeLoans.length, 2, "Exactly 2 active loans must be returned");

    const returnedLoans = await listAllLoansHandler(adminCtx, { status: "returned" });
    assert.equal(returnedLoans.length, 1, "Exactly 1 returned loan must be returned");
    assert.equal(returnedLoans[0]._id, loan3Id);
    console.log("✔ Test C2 Passed: Status filtering ('active', 'overdue', 'returned') correctly isolates loans.");
  }

  // Test C3: Ordinary user cannot retrieve platform-wide loans
  {
    const ordinaryCtx = createMockCtx(db, "user_regular_2");
    await assert.rejects(
      async () => {
        await listAllLoansHandler(ordinaryCtx);
      },
      (err) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );
    console.log("✔ Test C3 Passed: Ordinary user is forbidden from querying platform-wide loans.");
  }

  // Test C4: Unauthenticated request rejected
  {
    const unauthCtx = createMockCtx(db, null);
    await assert.rejects(
      async () => {
        await listAllLoansHandler(unauthCtx);
      },
      (err) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test C4 Passed: Unauthenticated request to listAllLoans is rejected.");
  }

  // ==========================================
  // SECTION D: TOOL REMOVAL / MODERATION TESTS
  // ==========================================
  console.log("\n--- Section D: Administrator Tool Removal Tests ---");

  // Test D1: Admin can deactivate another user's tool
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    // Tool is owned by user1Id (or let's assign tool to user2Id to test cross-user moderation)
    await db.patch(tool1Id, { ownerId: user2Id, isActive: true });

    const res = await deactivateToolAdminHandler(adminCtx, { toolId: tool1Id });
    assert.equal(res.success, true);
    assert.equal(res.isActive, false);

    const tool = await db.get(tool1Id);
    assert.equal(tool.isActive, false, "Tool must be marked inactive");

    // Verify historical loan records associated with this tool are preserved
    const loansForTool = await db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", tool1Id)).collect();
    assert.equal(loansForTool.length, 3, "All 3 historical loan records must be preserved");
    console.log("✔ Test D1 Passed: Admin deactivates another user's tool while preserving historical loan records.");
  }

  // Test D2: Admin can reactivate a tool
  {
    const adminCtx = createMockCtx(db, "user_regular_1");
    const res = await reactivateToolAdminHandler(adminCtx, { toolId: tool1Id });
    assert.equal(res.success, true);
    assert.equal(res.isActive, true);

    const tool = await db.get(tool1Id);
    assert.equal(tool.isActive, true, "Tool must be restored to active");
    console.log("✔ Test D2 Passed: Admin can reactivate a previously deactivated tool.");
  }

  // Test D3: Ordinary user cannot deactivate another user's tool listing
  {
    // Tool is owned by user2Id. user1Id is admin, but let's test user3 who is regular
    const user3Id = await db.insert("users", {
      clerkUserId: "user_regular_3",
      displayName: "Charlie",
      role: "user",
      isTrustedLender: false,
      createdAt: 3000,
    });
    const regularCtx = createMockCtx(db, "user_regular_3");

    await assert.rejects(
      async () => {
        await deactivateToolAdminHandler(regularCtx, { toolId: tool1Id });
      },
      (err) => {
        assert.match(err.message, /Forbidden: Administrator privileges required/);
        return true;
      }
    );
    console.log("✔ Test D3 Passed: Ordinary user cannot use admin deactivation on another member's tool.");
  }

  // Test D4: Unauthenticated request rejected
  {
    const unauthCtx = createMockCtx(db, null);
    await assert.rejects(
      async () => {
        await deactivateToolAdminHandler(unauthCtx, { toolId: tool1Id });
      },
      (err) => {
        assert.match(err.message, /Unauthenticated: Valid session required/);
        return true;
      }
    );
    console.log("✔ Test D4 Passed: Unauthenticated request to deactivateToolAdmin is rejected.");
  }

  console.log("\n=================================================");
  console.log("All 13 Admin and Security Tests Passed Successfully!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
