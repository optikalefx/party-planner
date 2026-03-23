import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  parties: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    food: v.optional(v.string()),
    drinks: v.optional(v.string()),
    dress: v.optional(v.string()),
    notes: v.optional(v.string()),
    partyType: v.optional(v.string()),
    inviteCode: v.string(),
    inviteStorageId: v.optional(v.string()),
    blindVoting: v.boolean(),
    charactersLocked: v.optional(v.boolean()),
    theme: v.optional(v.object({
      prompt: v.optional(v.string()),
      photoStorageId: v.optional(v.string()),
      css: v.optional(v.string()),
      headerHtml: v.optional(v.string()),
      footerHtml: v.optional(v.string()),
    })),
    reminder: v.optional(v.object({
      scheduledFunctionId: v.id("_scheduled_functions"),
      daysBefore: v.number(),
      time: v.string(),
    })),
  }).index("by_invite_code", ["inviteCode"])
    .index("by_user", ["userId"]),

  guests: defineTable({
    partyId: v.id("parties"),
    name: v.string(),
    rsvpStatus: v.union(v.literal("yes"), v.literal("no"), v.literal("pending")),
    phoneNumber: v.optional(v.string()),
    assignedCharacterId: v.optional(v.string()), // character ID or "detective"; bypasses voting
  }).index("by_party", ["partyId"]),

  characters: defineTable({
    partyId: v.id("parties"),
    name: v.string(),
    description: v.string(),
    order: v.number(),
  }).index("by_party", ["partyId"]),

  votes: defineTable({
    partyId: v.id("parties"),
    guestName: v.string(),
    rankings: v.array(v.id("characters")),
    wantsDetective: v.boolean(),
  }).index("by_party", ["partyId"])
    .index("by_party_guest", ["partyId", "guestName"]),

  chatMessages: defineTable({
    partyId: v.id("parties"),
    authorName: v.string(),
    body: v.string(),
  }).index("by_party", ["partyId"]),

  chatReactions: defineTable({
    messageId: v.id("chatMessages"),
    partyId: v.id("parties"),
    authorName: v.string(),
    emoji: v.string(),
  }).index("by_party", ["partyId"])
    .index("by_message", ["messageId"]),

  smsMessages: defineTable({
    to: v.string(),
    body: v.string(),
    status: v.string(),
    twilioSid: v.optional(v.string()),
    twilioError: v.optional(v.string()),
    twilioErrorCode: v.optional(v.string()),
  }),
});
