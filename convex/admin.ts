import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authHelpers";
import { isOverdue } from "./dateUtils";
import { toolCategoryValidator } from "./schema";

/**
 * ADMIN: GET PLATFORM OVERVIEW STATS
 * Requires authenticated administrator.
 * Computes platform-wide metrics across users, tools, requests, and loans.
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [allUsers, allTools, allRequests, allLoans] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("tools").collect(),
      ctx.db.query("borrowRequests").collect(),
      ctx.db.query("loans").collect(),
    ]);

    const activeTools = allTools.filter((t) => t.isActive);
    const inactiveTools = allTools.filter((t) => !t.isActive);
    const trustedLenders = allUsers.filter((u) => u.isTrustedLender);

    const activeLoans = allLoans.filter((l) => l.status === "active");
    const overdueLoans = activeLoans.filter((l) => isOverdue(l.dueDate));
    const returnedLoans = allLoans.filter((l) => l.status === "returned");

    const pendingRequests = allRequests.filter((r) => r.status === "pending");
    const approvedRequests = allRequests.filter((r) => r.status === "approved");
    const declinedRequests = allRequests.filter((r) => r.status === "declined");

    return {
      totalUsers: allUsers.length,
      trustedLendersCount: trustedLenders.length,
      totalTools: allTools.length,
      activeToolsCount: activeTools.length,
      inactiveToolsCount: inactiveTools.length,
      totalLoans: allLoans.length,
      activeLoansCount: activeLoans.length,
      overdueLoansCount: overdueLoans.length,
      returnedLoansCount: returnedLoans.length,
      totalRequests: allRequests.length,
      pendingRequestsCount: pendingRequests.length,
      approvedRequestsCount: approvedRequests.length,
      declinedRequestsCount: declinedRequests.length,
    };
  },
});

/**
 * ADMIN: LIST ALL USERS & MANAGE TRUSTED LENDERS
 * Requires authenticated administrator.
 * Exposes user information, trusted status, and lending/borrowing activity counts.
 */
export const listUsers = query({
  args: {
    filter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("trusted"),
        v.literal("regular"),
        v.literal("admin")
      )
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();

    // Sort newest first
    users.sort((a, b) => b.createdAt - a.createdAt);

    // Fetch tool and loan activity for each user
    const userSummaries = await Promise.all(
      users.map(async (user) => {
        const tools = await ctx.db
          .query("tools")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .collect();

        const activeLoansAsLender = await ctx.db
          .query("loans")
          .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const activeLoansAsBorrower = await ctx.db
          .query("loans")
          .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        return {
          _id: user._id,
          clerkUserId: user.clerkUserId,
          displayName: user.displayName,
          role: user.role,
          isTrustedLender: user.isTrustedLender,
          createdAt: user.createdAt,
          toolsCount: tools.length,
          activeToolsCount: tools.filter((t) => t.isActive).length,
          activeLoansAsLenderCount: activeLoansAsLender.length,
          activeLoansAsBorrowerCount: activeLoansAsBorrower.length,
        };
      })
    );

    // Apply filtering
    let filtered = userSummaries;
    if (args.filter && args.filter !== "all") {
      if (args.filter === "trusted") {
        filtered = filtered.filter((u) => u.isTrustedLender);
      } else if (args.filter === "regular") {
        filtered = filtered.filter((u) => !u.isTrustedLender && u.role === "user");
      } else if (args.filter === "admin") {
        filtered = filtered.filter((u) => u.role === "admin");
      }
    }

    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.clerkUserId.toLowerCase().includes(q)
      );
    }

    return filtered;
  },
});

/**
 * ADMIN: SET TRUSTED LENDER STATUS
 * Strictly requires authenticated administrator.
 * Updates target user's isTrustedLender flag.
 */
export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    isTrusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Not Found: Target user does not exist in the database.");
    }

    await ctx.db.patch(targetUser._id, {
      isTrustedLender: args.isTrusted,
    });

    return {
      success: true,
      userId: targetUser._id,
      isTrustedLender: args.isTrusted,
    };
  },
});

/**
 * ADMIN: LIST ALL PLATFORM LOANS
 * Strictly requires authenticated administrator.
 * Exposes all loans across all users, with tool and participant details,
 * status filtering, and explicit overdue identification.
 */
export const listAllLoans = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("all"),
        v.literal("active"),
        v.literal("overdue"),
        v.literal("returned")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const loans = await ctx.db.query("loans").order("desc").collect();

    const enriched = await Promise.all(
      loans.map(async (loan) => {
        const [tool, lender, borrower] = await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.lenderId),
          ctx.db.get(loan.borrowerId),
        ]);

        const loanIsOverdue =
          loan.status === "active" && isOverdue(loan.dueDate);

        return {
          _id: loan._id,
          requestId: loan.requestId,
          startDate: loan.startDate,
          dueDate: loan.dueDate,
          status: loan.status,
          returnedAt: loan.returnedAt,
          createdAt: loan.createdAt,
          isOverdue: loanIsOverdue,
          tool: tool
            ? {
                _id: tool._id,
                name: tool.name,
                category: tool.category,
                condition: tool.condition,
                isActive: tool.isActive,
              }
            : null,
          lender: lender
            ? {
                _id: lender._id,
                displayName: lender.displayName,
                isTrustedLender: lender.isTrustedLender,
                clerkUserId: lender.clerkUserId,
              }
            : null,
          borrower: borrower
            ? {
                _id: borrower._id,
                displayName: borrower.displayName,
                isTrustedLender: borrower.isTrustedLender,
                clerkUserId: borrower.clerkUserId,
              }
            : null,
        };
      })
    );

    // Apply filtering
    if (!args.status || args.status === "all") {
      return enriched;
    }

    if (args.status === "overdue") {
      return enriched.filter((l) => l.isOverdue);
    }

    if (args.status === "active") {
      return enriched.filter((l) => l.status === "active");
    }

    if (args.status === "returned") {
      return enriched.filter((l) => l.status === "returned");
    }

    return enriched;
  },
});

/**
 * ADMIN: LIST ALL PLATFORM TOOLS FOR MODERATION
 * Strictly requires authenticated administrator.
 * Exposes all tools (active and deactivated) across the entire platform with owner details.
 */
export const listAllTools = query({
  args: {
    category: v.optional(toolCategoryValidator),
    status: v.optional(
      v.union(v.literal("all"), v.literal("active"), v.literal("inactive"))
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const tools = await ctx.db.query("tools").order("desc").collect();

    const enriched = await Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);

        // Fetch loan history count for this tool
        const toolLoans = await ctx.db
          .query("loans")
          .withIndex("by_tool", (q) => q.eq("toolId", tool._id))
          .collect();

        const activeLoan = toolLoans.find((l) => l.status === "active") || null;

        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          isActive: tool.isActive,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt,
          owner: owner
            ? {
                _id: owner._id,
                displayName: owner.displayName,
                isTrustedLender: owner.isTrustedLender,
                clerkUserId: owner.clerkUserId,
              }
            : null,
          totalLoansCount: toolLoans.length,
          hasActiveLoan: activeLoan !== null,
        };
      })
    );

    let filtered = enriched;
    if (args.category) {
      filtered = filtered.filter((t) => t.category === args.category);
    }

    if (args.status && args.status !== "all") {
      if (args.status === "active") {
        filtered = filtered.filter((t) => t.isActive);
      } else if (args.status === "inactive") {
        filtered = filtered.filter((t) => !t.isActive);
      }
    }

    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.owner && t.owner.displayName.toLowerCase().includes(q))
      );
    }

    return filtered;
  },
});

/**
 * ADMIN: DEACTIVATE TOOL LISTING (Soft Removal)
 * Strictly requires authenticated administrator.
 * Preserves database record and historical loan integrity while removing from discovery.
 */
export const deactivateToolAdmin = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Not Found: Tool does not exist.");
    }

    await ctx.db.patch(tool._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      toolId: tool._id,
      isActive: false,
    };
  },
});

/**
 * ADMIN: REACTIVATE TOOL LISTING
 * Strictly requires authenticated administrator.
 * Restores a previously deactivated tool to active discovery.
 */
export const reactivateToolAdmin = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Not Found: Tool does not exist.");
    }

    await ctx.db.patch(tool._id, {
      isActive: true,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      toolId: tool._id,
      isActive: true,
    };
  },
});

/**
 * ADMIN: GET AUTOMATION & OUTBOX OVERVIEW
 * Requires authenticated administrator.
 * Exposes delivery metrics across automation outbox and activity write-backs.
 * Never exposes secrets, webhook URLs, or raw headers.
 */
export const getAutomationOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [outboxEvents, activities] = await Promise.all([
      ctx.db.query("automationOutbox").collect(),
      ctx.db.query("automationActivity").order("desc").take(25),
    ]);

    const counts = {
      pending: outboxEvents.filter((e) => e.status === "pending").length,
      processing: outboxEvents.filter((e) => e.status === "processing").length,
      sent: outboxEvents.filter((e) => e.status === "sent").length,
      failed: outboxEvents.filter((e) => e.status === "failed").length,
      total: outboxEvents.length,
    };

    return {
      counts,
      recentActivities: activities.map((a) => ({
        _id: a._id,
        idempotencyKey: a.idempotencyKey,
        eventType: a.eventType,
        result: a.result,
        summary: a.summary,
        createdAt: a.createdAt,
      })),
      recentOutbox: outboxEvents.slice(-10).reverse().map((e) => ({
        _id: e._id,
        eventId: e.eventId,
        eventType: e.eventType,
        status: e.status,
        attempts: e.attempts,
        lastError: e.lastError || null,
        createdAt: e.createdAt,
      })),
    };
  },
});


