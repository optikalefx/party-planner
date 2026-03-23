import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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

    // Check if the sender is the host (authenticated user who owns the party)
    const userId = await getAuthUserId(ctx);
    const party = await ctx.db.get(partyId);
    const partyName = party?.name ?? "the party";
    const isHost = userId !== null && party?.userId === userId;

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_party", (q) => q.eq("partyId", partyId))
      .collect();

    const guestsWithPhone = guests.filter((g) => g.phoneNumber);

    // Extract @mentions from the message
    const mentionPattern = /@([\w\s]+?)(?=\s@|\s[^@]|$)/g;
    const mentionedNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(trimmed)) !== null) {
      mentionedNames.push(match[1].trim().toLowerCase());
    }

    // Find mentioned guests
    const mentionedGuests = mentionedNames.length > 0
      ? guestsWithPhone.filter((g) =>
          mentionedNames.some((m) => g.name.toLowerCase() === m)
        )
      : [];

    if (mentionedNames.length > 0) {
      // Only notify mentioned guests
      for (const guest of mentionedGuests) {
        if (guest.name.toLowerCase() === authorName.toLowerCase()) continue;
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          to: guest.phoneNumber!,
          body: `${authorName} mentioned you in ${partyName}: "${trimmed}"`,
        });
      }
    } else if (isHost) {
      // Host message with no mentions -> notify everyone except the host
      for (const guest of guestsWithPhone) {
        if (guest.name.toLowerCase() === authorName.toLowerCase()) continue;
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          to: guest.phoneNumber!,
          body: `${partyName} host says: "${trimmed}"`,
        });
      }
    } else {
      // Non-host message with no mentions -> no notifications
    }
  },
});
