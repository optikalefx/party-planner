import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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

    // Fetch characters for name lookup
    const characters = await ctx.db
      .query("characters")
      .withIndex("by_party", (q) => q.eq("partyId", id))
      .collect();
    const charById = new Map(characters.map((c) => [c._id.toString(), c.name]));

    for (const { guestName, characterId } of assignments) {
      const guest = guestByName.get(guestName.toLowerCase());
      if (guest && characterId !== "unassigned") {
        await ctx.db.patch(guest._id, { assignedCharacterId: characterId });

        // Notify guest of their character assignment via SMS
        if (guest.phoneNumber) {
          const charName = characterId === "detective"
            ? "the Detective"
            : charById.get(characterId) ?? "your character";
          await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
            to: guest.phoneNumber,
            body: `Your character for ${party.name} has been revealed! You are ${charName}. Check the party page for details.`,
          });
        }
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

// ── Party Reminders ──────────────────────────────────────────────────────────

export const sendReminder = internalMutation({
  args: { partyId: v.id("parties") },
  handler: async (ctx, { partyId }) => {
    const party = await ctx.db.get(partyId);
    if (!party) return;

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .collect();

    const parts = [party.name];
    if (party.date) parts.push(`on ${party.date}`);
    if (party.time) parts.push(`at ${party.time}`);
    if (party.location) parts.push(`- ${party.location}`);

    const message = `Reminder: ${parts.join(" ")} is coming up! Don't forget to RSVP if you haven't already.`;

    for (const guest of guests) {
      if (guest.phoneNumber) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          to: guest.phoneNumber,
          body: message,
        });
      }
    }

    // Clear the reminder from the party after sending
    await ctx.db.patch(partyId, { reminder: undefined });
  },
});

export const scheduleReminder = mutation({
  args: {
    id: v.id("parties"),
    daysBefore: v.number(),
    time: v.string(),
    scheduledAtMs: v.number(),
  },
  handler: async (ctx, { id, daysBefore, time, scheduledAtMs }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");

    // Cancel existing reminder if one is scheduled
    if (party.reminder) {
      try {
        await ctx.scheduler.cancel(party.reminder.scheduledFunctionId);
      } catch {
        // Already executed or cancelled
      }
    }

    const scheduledFunctionId = await ctx.scheduler.runAt(
      scheduledAtMs,
      internal.parties.sendReminder,
      { partyId: id }
    );

    await ctx.db.patch(id, {
      reminder: { scheduledFunctionId, daysBefore, time },
    });
  },
});

export const cancelReminder = mutation({
  args: { id: v.id("parties") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const party = await ctx.db.get(id);
    if (!party || party.userId !== userId) throw new Error("Not authorized");

    if (party.reminder) {
      try {
        await ctx.scheduler.cancel(party.reminder.scheduledFunctionId);
      } catch {
        // Already executed or cancelled
      }
      await ctx.db.patch(id, { reminder: undefined });
    }
  },
});
