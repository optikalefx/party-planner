"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { callClaude, extractJson } from "./lib/claude";

export const parseInvite = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("File not found in storage");

    // Use URL source directly — avoids base64 size limits for large images.
    // PDFs still need base64 since Claude's URL source only supports images.
    const headResponse = await fetch(url, { method: "HEAD" });
    const contentType = headResponse.headers.get("content-type") || "image/jpeg";
    const isPdf = contentType.includes("pdf");

    let mediaBlock: unknown;

    if (isPdf) {
      const fileResponse = await fetch(url);
      const buffer = await fileResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      mediaBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };
    } else {
      mediaBlock = {
        type: "image",
        source: { type: "url", url },
      };
    }

    const text = await callClaude({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            mediaBlock,
            {
              type: "text",
              text: `Extract all party details from this invite. Return ONLY a JSON object with these fields (use null for missing):
{
  "name": "party name/title",
  "partyType": "type/genre of party (e.g. murder mystery, birthday, halloween, costume, cocktail, etc.)",
  "date": "date as written",
  "time": "time as written",
  "location": "venue/address",
  "food": "food info",
  "drinks": "drinks info",
  "dress": "dress code",
  "notes": "any other important notes (combine multiple if needed)"
}`,
            },
          ],
        },
      ],
    });

    return extractJson(text);
  },
});
