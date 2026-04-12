import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByParty = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, { partyId }) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .collect()
      .then((chars) => chars.sort((a, b) => a.order - b.order));
  },
});

export const create = mutation({
  args: {
    partyId: v.id("parties"),
    name: v.string(),
    description: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("characters", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("characters"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    required: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("characters") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
