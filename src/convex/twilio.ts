"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sendSms = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { to, body }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || !messagingServiceSid) {
      console.error("Twilio env vars not configured, skipping SMS");
      await ctx.runMutation(internal.smsLog.logSms, {
        to,
        body,
        status: "skipped",
        twilioError: "Twilio env vars not configured",
      });
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: to,
      MessagingServiceSid: messagingServiceSid,
      Body: body,
    });

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Twilio SMS failed (${resp.status}): ${text}`);
      let twilioErrorCode: string | undefined;
      try {
        const parsed = JSON.parse(text);
        twilioErrorCode = String(parsed.code ?? "");
      } catch {}
      await ctx.runMutation(internal.smsLog.logSms, {
        to,
        body,
        status: "failed",
        twilioError: `${resp.status}: ${text}`,
        twilioErrorCode,
      });
      return;
    }

    const data = await resp.json();
    await ctx.runMutation(internal.smsLog.logSms, {
      to,
      body,
      status: data.status ?? "sent",
      twilioSid: data.sid,
    });
  },
});
