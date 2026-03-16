import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByParty = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, { partyId }) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .collect();
  },
});

export const getByGuest = query({
  args: { partyId: v.id("parties"), guestName: v.string() },
  handler: async (ctx, { partyId, guestName }) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_party_guest", (q) =>
        q.eq("partyId", partyId).eq("guestName", guestName)
      )
      .unique();
  },
});

export const submitVote = mutation({
  args: {
    partyId: v.id("parties"),
    guestName: v.string(),
    rankings: v.array(v.id("characters")),
    wantsDetective: v.boolean(),
  },
  handler: async (ctx, { partyId, guestName, rankings, wantsDetective }) => {
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_party_guest", (q) =>
        q.eq("partyId", partyId).eq("guestName", guestName)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { rankings, wantsDetective });
      return existing._id;
    } else {
      return await ctx.db.insert("votes", { partyId, guestName, rankings, wantsDetective });
    }
  },
});
