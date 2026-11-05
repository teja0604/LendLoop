import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { toolCategoryValidator, toolConditionValidator } from "./schema";
import { requireAuthenticatedUser, requireOwnerOrAdmin } from "./authHelpers";

/**
 * PUBLIC TOOL QUERY (Unauthenticated)
 * Accessible to any visitor without logging in.
 * Supports optional category filtering.
 *
 * Strict Privacy Contract:
 * - Only active tools are returned.
 * - Only 'name' and 'category' are exposed.
 * - NEVER returns ownerId, owner name, descriptions, or loan history.
 */
export const getPublicAvailableTools = query({
  args: {
    category: v.optional(toolCategoryValidator),
  },
  handler: async (ctx, args) => {
    const activeTools = await ctx.db
      .query("tools")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const filtered = args.category
      ? activeTools.filter((tool) => tool.category === args.category)
      : activeTools;

    // Map to strictly allowed public representation
    return filtered.map((tool) => ({
      _id: tool._id,
      name: tool.name,
      category: tool.category,
    }));
  },
});

/**
 * AUTHENTICATED USER'S OWN TOOLS QUERY
 * Retrieves all tools belonging to the currently authenticated user (active and inactive).
 * Uses index 'by_owner'.
 */
export const getMyTools = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return tools;
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

/**
 * CREATE TOOL MUTATION
 * Creates a new tool listing for the authenticated user.
 *
 * Security:
 * - Requires a valid authenticated session.
 * - Resolves ownerId exclusively from verified user document.
 * - Enforces isActive = true on creation.
 * - Server-manages createdAt and updatedAt timestamps.
 * - Validates name and description lengths.
 */
export const createTool = mutation({
  args: {
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthenticatedUser(ctx);

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Validation Error: Tool name cannot be empty.");
    }
    if (trimmedName.length > 100) {
      throw new Error("Validation Error: Tool name cannot exceed 100 characters.");
    }

    const trimmedDescription = args.description.trim();
    if (trimmedDescription.length === 0) {
      throw new Error("Validation Error: Tool description cannot be empty.");
    }
    if (trimmedDescription.length > 2000) {
      throw new Error("Validation Error: Tool description cannot exceed 2000 characters.");
    }

    const now = Date.now();

    const toolId = await ctx.db.insert("tools", {
      ownerId: user._id,
      name: trimmedName,
      category: args.category,
      condition: args.condition,
      description: trimmedDescription,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return toolId;
  },
});

/**
 * UPDATE TOOL MUTATION
 * Updates an existing tool's editable properties.
 *
 * Security:
 * - Strictly requires caller to be the tool owner or an administrator.
 * - Never allows modifying ownerId, isActive, or createdAt.
 * - Updates updatedAt timestamp server-side.
 * - Validates input lengths.
 */
export const updateTool = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Not Found: Tool does not exist.");
    }

    // Enforce ownership or admin privilege
    await requireOwnerOrAdmin(ctx, tool.ownerId);

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Validation Error: Tool name cannot be empty.");
    }
    if (trimmedName.length > 100) {
      throw new Error("Validation Error: Tool name cannot exceed 100 characters.");
    }

    const trimmedDescription = args.description.trim();
    if (trimmedDescription.length === 0) {
      throw new Error("Validation Error: Tool description cannot be empty.");
    }
    if (trimmedDescription.length > 2000) {
      throw new Error("Validation Error: Tool description cannot exceed 2000 characters.");
    }

    await ctx.db.patch(args.toolId, {
      name: trimmedName,
      category: args.category,
      condition: args.condition,
      description: trimmedDescription,
      updatedAt: Date.now(),
    });

    return { success: true, toolId: args.toolId };
  },
});

/**
 * DEACTIVATE TOOL MUTATION (Soft Deletion)
 * Deactivates a tool listing so it no longer appears in public discovery or available pools.
 *
 * Security:
 * - Strictly requires caller to be the tool owner or an administrator.
 * - Does NOT physically delete the database record.
 * - Preserves historical integrity for existing loans and borrow requests.
 * - Sets isActive = false and updates updatedAt timestamp.
 */
export const deactivateTool = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Not Found: Tool does not exist.");
    }

    // Enforce ownership or admin privilege
    await requireOwnerOrAdmin(ctx, tool.ownerId);

    await ctx.db.patch(args.toolId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true, toolId: args.toolId };
  },
});
