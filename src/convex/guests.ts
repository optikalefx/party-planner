import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByParty = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, { partyId }) => {
    return await ctx.db
      .query("guests")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .collect();
  },
});

export const upsertRsvp = mutation({
  args: {
    partyId: v.id("parties"),
    name: v.string(),
    rsvpStatus: v.union(v.literal("yes"), v.literal("no"), v.literal("pending")),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, { partyId, name, rsvpStatus, phoneNumber }) => {
    const existing = await ctx.db
      .query("guests")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .filter((q) => q.eq(q.field("name"), name))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { rsvpStatus, phoneNumber });
      return existing._id;
    } else {
      return await ctx.db.insert("guests", { partyId, name, rsvpStatus, phoneNumber });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const assignGuest = mutation({
  args: {
    id: v.id("guests"),
    assignedCharacterId: v.optional(v.string()),
  },
  handler: async (ctx, { id, assignedCharacterId }) => {
    await ctx.db.patch(id, { assignedCharacterId });
  },
});
