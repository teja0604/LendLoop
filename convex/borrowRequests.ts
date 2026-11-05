import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./authHelpers";
import {
  validateBorrowingDateRange,
  doIntervalsOverlap,
} from "./dateUtils";

/**
 * CREATE BORROWING REQUEST
 * Borrower requests an active tool for a specified [startDate, endDate) calendar window.
 *
 * Security & Validation:
 * 1. Caller must be authenticated.
 * 2. Tool must exist and be active.
 * 3. Borrower cannot request their own tool.
 * 4. Dates must be valid ISO YYYY-MM-DD, not in the past, and endDate > startDate.
 * 5. Period must not overlap any existing active loan for this tool.
 * 6. Sets status to "pending". Does NOT create a loan at this stage.
 */
export const createRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Validation Error: Tool not found.");
    }

    if (!tool.isActive) {
      throw new Error("Validation Error: Cannot request an inactive or deactivated tool.");
    }

    if (tool.ownerId === user._id) {
      throw new Error("Validation Error: You cannot borrow your own tool.");
    }

    // Validate date format and bounds
    const dateValidation = validateBorrowingDateRange(args.startDate, args.endDate);
    if (!dateValidation.isValid) {
      throw new Error(`Validation Error: ${dateValidation.error}`);
    }

    // Check for conflicting active loans on this tool
    const existingActiveLoans = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", tool._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const conflictsWithActiveLoan = existingActiveLoans.some((loan) =>
      doIntervalsOverlap(args.startDate, args.endDate, loan.startDate, loan.dueDate)
    );

    if (conflictsWithActiveLoan) {
      throw new Error(
        "Availability Conflict: The selected tool is already reserved during these dates by an active loan."
      );
    }

    const now = Date.now();

    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      lenderId: tool.ownerId,
      borrowerId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

/**
 * GET MY BORROWING REQUESTS (Caller as Borrower)
 * Retrieves all requests submitted by the authenticated user.
 */
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (req) => {
        const tool = await ctx.db.get(req.toolId);
        const lender = await ctx.db.get(req.lenderId);

        return {
          ...req,
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
                displayName: lender.displayName,
                isTrustedLender: lender.isTrustedLender,
              }
            : null,
        };
      })
    );
  },
});

/**
 * GET INCOMING BORROWING REQUESTS (Caller as Lender)
 * Retrieves requests submitted by neighbors for tools owned by the caller.
 */
export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (req) => {
        const tool = await ctx.db.get(req.toolId);
        const borrower = await ctx.db.get(req.borrowerId);

        return {
          ...req,
          tool: tool
            ? {
                _id: tool._id,
                name: tool.name,
                category: tool.category,
                condition: tool.condition,
                isActive: tool.isActive,
              }
            : null,
          borrower: borrower
            ? {
                displayName: borrower.displayName,
              }
            : null,
        };
      })
    );
  },
});

/**
 * APPROVE BORROWING REQUEST (Atomic Transaction)
 * Lender approves a pending request.
 *
 * Security & Transaction Guarantees:
 * 1. Caller must be the actual lender.
 * 2. Request status must be "pending".
 * 3. Borrower and lender cannot be the same.
 * 4. Tool must exist and still be active.
 * 5. Rechecks date availability against any active loans immediately before commit.
 * 6. Creates exactly one active loan record.
 * 7. Updates request status to "approved".
 */
export const approveRequest = mutation({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Not Found: Borrow request does not exist.");
    }

    if (request.lenderId !== user._id) {
      throw new Error("Forbidden: Only the tool's lender can approve this request.");
    }

    if (request.status !== "pending") {
      throw new Error(
        `Invalid Transition: Cannot approve a request with status "${request.status}". Only pending requests can be approved.`
      );
    }

    if (request.borrowerId === request.lenderId) {
      throw new Error("Invalid Transaction: Borrower and lender cannot be the same user.");
    }

    const tool = await ctx.db.get(request.toolId);
    if (!tool) {
      throw new Error("Not Found: Tool does not exist.");
    }

    if (!tool.isActive) {
      throw new Error("Invalid Request: Tool is currently inactive or deactivated.");
    }

    if (tool.ownerId !== request.lenderId) {
      throw new Error("Security Violation: Tool owner does not match lender record.");
    }

    // Recheck active loans for overlap immediately before approving
    const existingActiveLoans = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", tool._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const conflicts = existingActiveLoans.some((loan) =>
      doIntervalsOverlap(request.startDate, request.endDate, loan.startDate, loan.dueDate)
    );

    if (conflicts) {
      throw new Error(
        "Availability Conflict: Tool already has an active loan overlapping with these dates."
      );
    }

    const now = Date.now();

    // 1. Create the active loan record
    const loanId = await ctx.db.insert("loans", {
      requestId: request._id,
      toolId: request.toolId,
      lenderId: request.lenderId,
      borrowerId: request.borrowerId,
      startDate: request.startDate,
      dueDate: request.endDate,
      status: "active",
      createdAt: now,
    });

    // 2. Mark the request as approved
    await ctx.db.patch(request._id, {
      status: "approved",
      updatedAt: now,
    });

    return {
      success: true,
      loanId,
      requestId: request._id,
    };
  },
});

/**
 * DECLINE BORROWING REQUEST
 * Lender declines a pending request.
 *
 * Security:
 * 1. Caller must be the actual lender.
 * 2. Request status must be "pending".
 * 3. Does NOT create a loan.
 * 4. Updates status to "declined".
 */
export const declineRequest = mutation({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Not Found: Borrow request does not exist.");
    }

    if (request.lenderId !== user._id) {
      throw new Error("Forbidden: Only the tool's lender can decline this request.");
    }

    if (request.status !== "pending") {
      throw new Error(
        `Invalid Transition: Cannot decline a request with status "${request.status}". Only pending requests can be declined.`
      );
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "declined",
      updatedAt: now,
    });

    return {
      success: true,
      requestId: request._id,
    };
  },
});

