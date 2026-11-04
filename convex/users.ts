import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, requireAdmin } from "./authHelpers";

/**
 * Returns the currently authenticated user record from Convex database.
 */
export const viewer = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await getAuthenticatedUser(ctx);
  },
});

/**
 * Provisions or retrieves the application user record for the authenticated Clerk caller.
 * Idempotent: if the record exists, it updates displayName if needed and returns the record.
 * Default role is strictly "user" and isTrustedLender is false.
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Cannot provision user without identity.");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    const displayName =
      identity.name ||
      identity.nickname ||
      identity.givenName ||
      identity.email?.split("@")[0] ||
      "Neighbor";

    if (existingUser !== null) {
      // If display name changed in Clerk, sync it safely
      if (existingUser.displayName !== displayName) {
        await ctx.db.patch(existingUser._id, { displayName });
        return await ctx.db.get(existingUser._id);
      }
      return existingUser;
    }

    // New user creation: role is strictly "user", isTrustedLender is false
    const newUserId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      displayName,
      role: "user",
      isTrustedLender: false,
      createdAt: Date.now(),
    });

    return await ctx.db.get(newUserId);
  },
});

/**
 * Trusted server-side bootstrap mutation to promote an existing user to admin.
 * Can be executed securely via Convex Dashboard or Convex CLI:
 * `npx.cmd convex run users:bootstrapAdmin '{"clerkUserId": "user_xxx"}'`
 */
export const bootstrapAdmin = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { clerkUserId: string }) => {
    // If there is already an admin in the database, enforce that caller must be an admin
    const anyAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();

    if (anyAdmin !== null) {
      // An admin exists; require the caller to be an authenticated admin
      await requireAdmin(ctx);
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!targetUser) {
      throw new Error(
        `User with clerkUserId ${args.clerkUserId} not found. Ensure the user has logged in once to provision their record.`
      );
    }

    await ctx.db.patch(targetUser._id, { role: "admin" });
    return {
      success: true,
      userId: targetUser._id,
      clerkUserId: targetUser.clerkUserId,
      role: "admin",
    };
  },
});
