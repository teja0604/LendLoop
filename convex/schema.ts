import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * LendLoop Approved 6-Table Database Schema
 *
 * Controlled Enums:
 * - User Role: "user" | "admin"
 * - Tool Category: "Power Tools" | "Garden" | "Kitchen" | "Camping" | "Cleaning" | "Other"
 * - Tool Condition: "New" | "Excellent" | "Good" | "Fair"
 * - Request Status: "pending" | "approved" | "declined"
 * - Loan Status: "active" | "returned"
 * - Outbox Event Type: "borrow_request.created" | "borrow_request.approved" | "borrow_request.declined" | "loan.created" | "loan.returned" | "request.created" | "request.approved" | "request.declined"
 * - Outbox Status: "pending" | "processing" | "sent" | "failed"
 * - Activity Result: "sent" | "failed"
 */

export const roleValidator = v.union(v.literal("user"), v.literal("admin"));

export const toolCategoryValidator = v.union(
  v.literal("Power Tools"),
  v.literal("Garden"),
  v.literal("Kitchen"),
  v.literal("Camping"),
  v.literal("Cleaning"),
  v.literal("Other")
);

export const toolConditionValidator = v.union(
  v.literal("New"),
  v.literal("Excellent"),
  v.literal("Good"),
  v.literal("Fair")
);

export const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined")
);

export const loanStatusValidator = v.union(
  v.literal("active"),
  v.literal("returned")
);

export const outboxEventTypeValidator = v.union(
  v.literal("borrow_request.created"),
  v.literal("borrow_request.approved"),
  v.literal("borrow_request.declined"),
  v.literal("loan.created"),
  v.literal("loan.returned"),
  v.literal("loan.overdue"),
  // Backward-compatible aliases
  v.literal("request.created"),
  v.literal("request.approved"),
  v.literal("request.declined")
);

export const outboxStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("sent"),
  v.literal("failed")
);

export default defineSchema({
  // Table 1: Users
  users: defineTable({
    clerkUserId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    role: roleValidator,
    isTrustedLender: v.boolean(),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkUserId"]),

  // Table 2: Tools
  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_active", ["isActive"]),

  // Table 3: Borrow Requests
  borrowRequests: defineTable({
    toolId: v.id("tools"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(), // ISO YYYY-MM-DD
    endDate: v.string(),   // ISO YYYY-MM-DD
    status: requestStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_lender", ["lenderId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status", ["status"]),

  // Table 4: Loans
  loans: defineTable({
    requestId: v.id("borrowRequests"),
    toolId: v.id("tools"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(), // ISO YYYY-MM-DD
    dueDate: v.string(),   // ISO YYYY-MM-DD
    status: loanStatusValidator,
    returnedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_lender", ["lenderId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status_and_due_date", ["status", "dueDate"]),

  // Table 5: Automation Outbox
  automationOutbox: defineTable({
    eventId: v.string(), // Unique UUID
    eventType: outboxEventTypeValidator,
    requestId: v.id("borrowRequests"),
    loanId: v.optional(v.id("loans")),
    status: outboxStatusValidator,
    attempts: v.number(),
    nextRetryAt: v.number(),
    processingStartedAt: v.optional(v.number()),
    claimToken: v.optional(v.string()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_status", ["status"]),

  // Table 6: Automation Activity
  automationActivity: defineTable({
    idempotencyKey: v.string(), // e.g. "overdue:<loanId>:<YYYY-MM-DD>"
    requestId: v.optional(v.id("borrowRequests")),
    loanId: v.optional(v.id("loans")),
    eventType: v.string(),
    recipientUserId: v.optional(v.id("users")),
    result: v.union(v.literal("sent"), v.literal("failed")),
    summary: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_idempotency_key", ["idempotencyKey"]),
});
