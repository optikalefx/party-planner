"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { callClaude, extractJson } from "./lib/claude";

export const generateTheme = action({
  args: {
    partyName: v.string(),
    partyType: v.optional(v.string()),
    prompt: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { partyName, partyType, prompt, photoStorageId }) => {
    const contentBlocks: unknown[] = [];

    if (photoStorageId) {
      const url = await ctx.storage.getUrl(photoStorageId);
      if (url) {
        contentBlocks.push({
          type: "image",
          source: { type: "url", url },
        });
      }
    }

    contentBlocks.push({
      type: "text",
      text: `You are a creative web designer. Generate a complete CSS theme and decorative HTML/SVG for a ${partyType ?? "party"} party page.

Party name: "${partyName}"
Party type: "${partyType ?? "general party"}"
Theme description: "${prompt}"

The page uses these CSS classes you must style:
- .party-page — full page wrapper
- .party-header-deco — decorative header area (inject your SVG art here)
- .party-hero — hero section with .party-title (h1) and .party-subtitle
- .party-main — main content wrapper
- .party-section — each content section
- .section-title — section headings (h2)
- .party-card — cards for characters and guests
- .party-btn — buttons (.party-btn-primary, .party-btn-secondary)
- .form-group — form field wrapper
- .party-input — text inputs and selects
- .party-label — labels
- .badge — status badges (.badge-yes, .badge-no, .badge-pending)
- .vote-option — character voting selection items (.vote-option.selected)
- .vote-option-rank — rank number inside a vote option
- .character-name, .character-desc — character card parts
- .guest-row — individual guest row in the list
- .party-footer-deco — decorative footer area

Requirements:
1. Include @import for 1-2 Google Fonts that perfectly match the theme
2. Atmospheric and visually striking — match the mood and aesthetic to the party type
3. The headerHtml and footerHtml should be inline SVG art that matches the theme (can be elaborate)
4. Style ALL classes listed above to be visually cohesive and beautiful
5. Ensure readable text despite dramatic styling
6. Buttons and forms must look great and be clearly usable
7. Use CSS custom properties (--color-bg, --color-surface, --color-primary, --color-accent, --color-text, --color-muted, --font-heading, --font-body)

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{"css": "...", "headerHtml": "...", "footerHtml": "..."}`,
    });

    const text = await callClaude({
      model: "claude-opus-4-6",
      max_tokens: 16000,
      messages: [{ role: "user", content: contentBlocks }],
    });

    return extractJson(text) as { css: string; headerHtml: string; footerHtml: string };
  },
});
