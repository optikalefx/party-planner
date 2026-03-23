import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const logSms = internalMutation({
  args: {
    to: v.string(),
    body: v.string(),
    status: v.string(),
    twilioSid: v.optional(v.string()),
    twilioError: v.optional(v.string()),
    twilioErrorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("smsMessages", args);
  },
});

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.query("smsMessages").order("desc").take(200);
  },
});
