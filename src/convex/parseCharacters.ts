"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { callClaude } from "./lib/claude";

export const parseCharacters = action({
  args: {
    text: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { text, storageId }) => {
    console.log("[parseCharacters] storageId:", storageId, "text length:", text.length);
    const content: unknown[] = [];

    if (storageId) {
      const url = await ctx.storage.getUrl(storageId);
      console.log("[parseCharacters] storage url:", url);
      if (url) {
        const headRes = await fetch(url, { method: "HEAD" });
        console.log("[parseCharacters] image content-type:", headRes.headers.get("content-type"), "content-length:", headRes.headers.get("content-length"));
        content.push({ type: "image", source: { type: "url", url } });
      }
    }

    content.push({
      type: "text",
      text: `Extract the characters from the following content. Return ONLY a JSON array of objects, each with "name" and "description" fields. Include all characters you can find. If a character has no description, use an empty string.

Example output format:
[
  {"name": "Lady Whitmore", "description": "The wealthy hostess with a dark secret"},
  {"name": "Colonel Blackwood", "description": "Retired military man hiding his past"}
]

Content to parse:
${text}`,
    });

    const response = await callClaude({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    const match = response.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No character list found in Claude response");
    return JSON.parse(match[0]) as { name: string; description: string }[];
  },
});
