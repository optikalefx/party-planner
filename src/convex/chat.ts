import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByParty = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, { partyId }) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .order("asc")
      .collect();
  },
});

export const listReactionsByParty = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, { partyId }) => {
    return await ctx.db
      .query("chatReactions")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .collect();
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("chatMessages"),
    partyId: v.id("parties"),
    authorName: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, partyId, authorName, emoji }) => {
    const existing = await ctx.db
      .query("chatReactions")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .filter((q) =>
        q.and(
          q.eq(q.field("authorName"), authorName),
          q.eq(q.field("emoji"), emoji)
        )
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("chatReactions", { messageId, partyId, authorName, emoji });
    }
  },
});

export const sendMessage = mutation({
  args: {
    partyId: v.id("parties"),
    authorName: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { partyId, authorName, body }) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    await ctx.db.insert("chatMessages", { partyId, authorName, body: trimmed });
  },
});
