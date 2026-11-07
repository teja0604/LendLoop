import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./authHelpers";
import { isOverdue } from "./dateUtils";

/**
 * GET MY LOANS
 * Retrieves all active and returned loans where the caller is either the lender or borrower.
 */
export const getMyLoans = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuthenticatedUser(ctx);

    // Fetch loans where user is lender
    const loansAsLender = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect();

    // Fetch loans where user is borrower
    const loansAsBorrower = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();

    // Combine and sort by createdAt descending
    const combined = [...loansAsLender, ...loansAsBorrower].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    return await Promise.all(
      combined.map(async (loan) => {
        const isLender = loan.lenderId === user._id;
        const otherUserId = isLender ? loan.borrowerId : loan.lenderId;

        const otherUser = await ctx.db.get(otherUserId);
        const tool = await ctx.db.get(loan.toolId);

        return {
          ...loan,
          role: (isLender ? "lender" : "borrower") as "lender" | "borrower",
          isOverdue: loan.status === "active" && isOverdue(loan.dueDate),
          otherParticipant: otherUser
            ? {
                displayName: otherUser.displayName,
                isTrustedLender: otherUser.isTrustedLender,
              }
            : null,
          tool: tool
            ? {
                _id: tool._id,
                name: tool.name,
                category: tool.category,
                condition: tool.condition,
                isActive: tool.isActive,
              }
            : null,
        };
      })
    );
  },
});

/**
 * MARK LOAN AS RETURNED
 * Confirms that a borrowed tool has been returned to the lender.
 *
 * Security & Integrity:
 * 1. Caller must be either the recorded lender or the borrower.
 * 2. Unrelated users are rejected with Forbidden.
 * 3. Loan must exist and have status "active".
 * 4. Updates status to "returned" and sets server-generated returnedAt timestamp.
 * 5. Does not physically delete the record, preserving historical integrity.
 */
export const markReturned = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error("Not Found: Loan does not exist.");
    }

    if (loan.status !== "active") {
      throw new Error(
        `Invalid Transition: Cannot mark loan as returned. Current status is already "${loan.status}".`
      );
    }

    // Verify caller is either lender or borrower
    const isLender = loan.lenderId === user._id;
    const isBorrower = loan.borrowerId === user._id;

    if (!isLender && !isBorrower) {
      throw new Error("Forbidden: You are not a participant in this loan.");
    }

    const now = Date.now();
    await ctx.db.patch(loan._id, {
      status: "returned",
      returnedAt: now,
    });

    // Transactional Outbox: Emit loan.returned atomically
    const eventIdReturned = `evt_${now}_${Math.random().toString(36).slice(2, 9)}`;
    await ctx.db.insert("automationOutbox", {
      eventId: eventIdReturned,
      eventType: "loan.returned",
      requestId: loan.requestId,
      loanId: loan._id,
      status: "pending",
      attempts: 0,
      nextRetryAt: now,
      createdAt: now,
    });

    return {
      success: true,
      loanId: loan._id,
    };
  },
});

