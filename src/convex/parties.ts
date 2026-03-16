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
    return await ctx.db.query("parties").order("desc").collect();
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
    const inviteCode = generateInviteCode();
    return await ctx.db.insert("parties", {
      ...args,
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
    await ctx.db.patch(id, { theme });
  },
});

export const remove = mutation({
  args: { id: v.id("parties") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
