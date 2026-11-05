import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Retrieves the application user document for the currently authenticated caller.
 * Returns null if the caller is unauthenticated or has not yet been provisioned.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  return user;
}

/**
 * Enforces that the caller is authenticated and has an existing user record.
 * Throws an error if unauthenticated or not provisioned.
 */
export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<{ identity: NonNullable<Awaited<ReturnType<typeof ctx.auth.getUserIdentity>>>; user: Doc<"users"> }> {
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

/**
 * Enforces that the caller is authenticated and possesses the 'admin' role in the database.
 * Throws an error if the user is unauthenticated or not an administrator.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<{ identity: NonNullable<Awaited<ReturnType<typeof ctx.auth.getUserIdentity>>>; user: Doc<"users"> }> {
  const { identity, user } = await requireAuthenticatedUser(ctx);

  if (user.role !== "admin") {
    throw new Error("Forbidden: Administrator privileges required.");
  }

  return { identity, user };
}

/**
 * Enforces that the caller is the owner of a specific resource or an administrator.
 * Throws an error if the caller is not authorized.
 */
export async function requireOwnerOrAdmin(
  ctx: QueryCtx | MutationCtx,
  ownerId: Id<"users">
): Promise<{ user: Doc<"users">; isAdmin: boolean }> {
  const { user } = await requireAuthenticatedUser(ctx);

  const isOwner = user._id === ownerId;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Forbidden: You do not have permission to access or modify this record.");
  }

  return { user, isAdmin };
}
