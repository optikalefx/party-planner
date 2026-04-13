"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, { to, subject, html }) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("Resend API key not configured, skipping email");
      await ctx.runMutation(internal.emailLog.logEmail, {
        to,
        subject,
        status: "skipped",
        error: "Resend API key not configured",
      });
      return;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "hey@mysteryinvite.com",
          to,
          subject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Resend email failed (${response.status}):`, data);
        await ctx.runMutation(internal.emailLog.logEmail, {
          to,
          subject,
          status: "failed",
          error: data.message || `${response.status}: Unknown error`,
          resendId: undefined,
        });
        return;
      }

      await ctx.runMutation(internal.emailLog.logEmail, {
        to,
        subject,
        status: "sent",
        resendId: data.id,
      });
    } catch (err) {
      console.error("Email send error:", err);
      await ctx.runMutation(internal.emailLog.logEmail, {
        to,
        subject,
        status: "failed",
        error: String(err),
      });
    }
  },
});
