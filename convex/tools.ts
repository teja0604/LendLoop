import { query } from "./_generated/server";
import { v } from "convex/values";
import { toolCategoryValidator } from "./schema";
import { requireAuthenticatedUser } from "./authHelpers";

/**
 * PUBLIC TOOL QUERY (Unauthenticated)
 * Accessible to any visitor without logging in.
 *
 * Strict Privacy Contract:
 * - Only active tools are returned.
 * - Only 'name' and 'category' are exposed.
 * - NEVER returns ownerId, owner name, descriptions, or loan history.
 */
export const getPublicAvailableTools = query({
  args: {},
  handler: async (ctx) => {
    const activeTools = await ctx.db
      .query("tools")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Map to strictly allowed public representation
    return activeTools.map((tool) => ({
      _id: tool._id,
      name: tool.name,
      category: tool.category,
    }));
  },
});

/**
 * AUTHENTICATED TOOLS QUERY
 * Requires a valid user session.
 * Returns full tool details for the authenticated dashboard.
 * Supports optional category filtering.
 */
export const listTools = query({
  args: {
    category: v.optional(toolCategoryValidator),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const toolsQuery = ctx.db
      .query("tools")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    const tools = await toolsQuery.collect();

    if (args.category) {
      return tools.filter((tool) => tool.category === args.category);
    }

    return tools;
  },
});

/**
 * AUTHENTICATED SINGLE TOOL DETAIL QUERY
 * Requires a valid user session.
 * Exposes detailed tool info and owner display name (without sensitive user info).
 */
export const getToolById = query({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool || !tool.isActive) {
      return null;
    }

    const owner = await ctx.db.get(tool.ownerId);

    return {
      ...tool,
      owner: owner
        ? {
            displayName: owner.displayName,
            isTrustedLender: owner.isTrustedLender,
          }
        : null,
    };
  },
});
