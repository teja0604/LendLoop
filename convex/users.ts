import { mutation, query, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
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
 * A client cannot modify their own role, clerkUserId, or isTrustedLender status.
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

    const email = identity.email || undefined;

    if (existingUser !== null) {
      // If display name or email changed in Clerk, sync it safely
      const patchUpdates: { displayName?: string; email?: string } = {};
      if (existingUser.displayName !== displayName) {
        patchUpdates.displayName = displayName;
      }
      if (email && existingUser.email !== email) {
        patchUpdates.email = email;
      }
      if (Object.keys(patchUpdates).length > 0) {
        await ctx.db.patch(existingUser._id, patchUpdates);
        return await ctx.db.get(existingUser._id);
      }
      return existingUser;
    }

    // New user creation: role is strictly "user", isTrustedLender is false
    const newUserId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      displayName,
      email,
      role: "user",
      isTrustedLender: false,
      createdAt: Date.now(),
    });

    return await ctx.db.get(newUserId);
  },
});

/**
 * INTERNAL / TRUSTED SERVER-ONLY MUTATION.
 * Inaccessible from the public API or browser clients (`api.users.bootstrapAdmin` is not generated).
 * Can ONLY be executed via trusted Convex CLI or server dashboard:
 * `npx.cmd convex run users:bootstrapAdmin '{"clerkUserId": "user_xxx"}'`
 *
 * Security properties:
 * 1. Initial bootstrap: If no admin exists in the database, elevates the specified user to 'admin'.
 * 2. Subsequent calls: If an admin already exists, strictly requires the caller to be an authenticated admin.
 * 3. Cannot be invoked by unauthenticated or ordinary public clients.
 */
export const bootstrapAdmin = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { clerkUserId: string }) => {
    // If an administrator already exists, require caller to be an existing admin
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
      throw new Error(
        `User with clerkUserId "${args.clerkUserId}" not found in database. The user must sign in once to provision their initial user record.`
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
