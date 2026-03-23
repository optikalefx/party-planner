import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("parties")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    return await ctx.db
      .query("parties")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .unique();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    food: v.optional(v.string()),
    drinks: v.optional(v.string()),
    dress: v.optional(v.string()),
    notes: v.optional(v.string()),
    partyType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const inviteCode = generateInviteCode();
    return await ctx.db.insert("parties", {
      ...args,
      userId,
      inviteCode,
      blindVoting: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("parties"),
    name: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    food: v.optional(v.string()),
    drinks: v.optional(v.string()),
    dress: v.optional(v.string()),
    notes: v.optional(v.string()),
    partyType: v.optional(v.string()),
    blindVoting: v.optional(v.boolean()),
    inviteStorageId: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(id, fields);
  },
});

export const updateTheme = mutation({
  args: {
    id: v.id("parties"),
    theme: v.object({
      prompt: v.optional(v.string()),
      photoStorageId: v.optional(v.string()),
      css: v.optional(v.string()),
      headerHtml: v.optional(v.string()),
      footerHtml: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, theme }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(id, { theme });
  },
});

export const lockCharacters = mutation({
  args: {
    id: v.id("parties"),
    assignments: v.array(v.object({
      guestName: v.string(),
      characterId: v.string(),
    })),
  },
  handler: async (ctx, { id, assignments }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");

    // Save each assignment to the corresponding guest record
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_party", (q) => q.eq("partyId", id))
      .collect();

    const guestByName = new Map(guests.map((g) => [g.name.toLowerCase(), g]));

    for (const { guestName, characterId } of assignments) {
      const guest = guestByName.get(guestName.toLowerCase());
      if (guest && characterId !== "unassigned") {
        await ctx.db.patch(guest._id, { assignedCharacterId: characterId });
      }
    }

    await ctx.db.patch(id, { charactersLocked: true });
  },
});

export const unlockCharacters = mutation({
  args: { id: v.id("parties") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");

    // Clear all guest assignments
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_party", (q) => q.eq("partyId", id))
      .collect();

    for (const guest of guests) {
      if (guest.assignedCharacterId) {
        await ctx.db.patch(guest._id, { assignedCharacterId: undefined });
      }
    }

    await ctx.db.patch(id, { charactersLocked: false });
  },
});

export const remove = mutation({
  args: { id: v.id("parties") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(id);
  },
});
