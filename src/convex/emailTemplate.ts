// Email template builder for Mystery Invite
// Colors from design system
const COLORS = {
  dark: "#0e0f1a",
  surface: "#151624",
  primary: "#722F37", // Burgundy
  secondary: "#C9A96E", // Gold
  text: "#F5F0E8", // Parchment
  textMuted: "rgba(245, 240, 232, 0.7)",
  textFaint: "rgba(245, 240, 232, 0.4)",
  border: "rgba(201, 169, 110, 0.2)",
};

interface EmailOptions {
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function buildEmailHTML(options: EmailOptions): string {
  const { title, content, ctaText, ctaUrl } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: ${COLORS.dark};
      color: ${COLORS.text};
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: ${COLORS.surface};
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, ${COLORS.primary} 0%, #4a1820 100%);
      padding: 40px 30px;
      text-align: center;
      border-bottom: 2px solid ${COLORS.secondary};
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      display: block;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      color: ${COLORS.text};
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section p {
      margin: 0 0 12px 0;
      font-size: 15px;
      color: ${COLORS.text};
    }
    .section p:last-child {
      margin-bottom: 0;
    }
    .highlight {
      color: ${COLORS.secondary};
      font-weight: 600;
    }
    .message-box {
      background: ${COLORS.primary}15;
      border-left: 4px solid ${COLORS.secondary};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
      font-style: italic;
      color: ${COLORS.text};
    }
    .cta-button {
      display: inline-block;
      background: ${COLORS.primary};
      color: ${COLORS.text};
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      font-size: 15px;
      border: 1px solid ${COLORS.secondary};
      transition: all 0.2s;
      margin-top: 8px;
    }
    .cta-button:hover {
      background: ${COLORS.secondary};
      color: ${COLORS.dark};
    }
    .footer {
      background: ${COLORS.dark};
      padding: 20px 30px;
      font-size: 12px;
      color: ${COLORS.textFaint};
      text-align: center;
      border-top: 1px solid ${COLORS.border};
    }
    .divider {
      height: 1px;
      background: ${COLORS.border};
      margin: 24px 0;
    }
    @media (max-width: 600px) {
      .container {
        border-radius: 0;
      }
      .header {
        padding: 30px 20px;
      }
      .content {
        padding: 30px 20px;
      }
      .title {
        font-size: 24px;
      }
      .logo {
        width: 56px;
        height: 56px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://mysteryinvite.com/logo.png" alt="Mystery Invite" class="logo" />
      <h1 class="title">${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      ${content}
      ${ctaUrl && ctaText
        ? `<a href="${escapeHtml(ctaUrl)}" class="cta-button">${escapeHtml(ctaText)}</a>`
        : ""}
    </div>
    <div class="footer">
      <p style="margin: 0;">🎭 Mystery Invite</p>
      <p style="margin: 4px 0 0 0;">Plan. Investigate. Solve.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Helper functions for specific email types

export function buildMentionEmail(
  mentionerName: string,
  partyName: string,
  message: string,
  partyUrl: string
): string {
  return buildEmailHTML({
    title: `You've been mentioned!`,
    content: `
      <div class="section">
        <p><span class="highlight">${escapeHtml(mentionerName)}</span> mentioned you in <span class="highlight">${escapeHtml(partyName)}</span>:</p>
      </div>
      <div class="message-box">"${escapeHtml(message)}"</div>
      <div class="section">
        <p>Check the party chat to respond and keep the conversation going!</p>
      </div>
    `,
    ctaText: "View Chat",
    ctaUrl: partyUrl,
  });
}

export function buildHostMessageEmail(
  partyName: string,
  message: string,
  partyUrl: string
): string {
  return buildEmailHTML({
    title: `Message from ${escapeHtml(partyName)}`,
    content: `
      <div class="section">
        <p>The host of <span class="highlight">${escapeHtml(partyName)}</span> has an update for you:</p>
      </div>
      <div class="message-box">"${escapeHtml(message)}"</div>
      <div class="section">
        <p>Head to the party page for more details and to chat with other guests.</p>
      </div>
    `,
    ctaText: "View Party",
    ctaUrl: partyUrl,
  });
}

export function buildCharacterAssignmentEmail(
  partyName: string,
  characterName: string,
  characterDescription: string,
  partyUrl: string
): string {
  const isDetective = characterName === "the Detective";
  const descriptionText = isDetective
    ? "You'll be observing and solving the mystery — no character to play, just your wits!"
    : characterDescription;

  return buildEmailHTML({
    title: `Your character has been revealed!`,
    content: `
      <div class="section">
        <p>For <span class="highlight">${escapeHtml(partyName)}</span>, you are assigned as:</p>
      </div>
      <div style="background: ${COLORS.primary}20; border: 2px solid ${COLORS.secondary}; padding: 24px; margin: 24px 0; border-radius: 4px; text-align: center;">
        <p style="font-size: 24px; font-weight: 700; margin: 0; color: ${COLORS.secondary};">${escapeHtml(characterName)}</p>
      </div>
      <div class="section">
        <p>${escapeHtml(descriptionText)}</p>
      </div>
      <div class="divider"></div>
      <div class="section">
        <p>Head to the party page to see the full cast and start preparing for the mystery!</p>
      </div>
    `,
    ctaText: "View Your Role",
    ctaUrl: partyUrl,
  });
}

export function buildReminderEmail(
  partyName: string,
  partyDate: string,
  partyTime: string,
  partyLocation: string,
  partyUrl: string
): string {
  const parts = [];
  if (partyDate) parts.push(partyDate);
  if (partyTime) parts.push(`at ${partyTime}`);
  if (partyLocation) parts.push(partyLocation);
  const details = parts.join(" • ");

  return buildEmailHTML({
    title: `Reminder: ${escapeHtml(partyName)} is coming up!`,
    content: `
      <div class="section">
        <p><span class="highlight">${escapeHtml(partyName)}</span> is almost here!</p>
      </div>
      ${details ? `<div class="section"><p><strong>When:</strong> ${escapeHtml(details)}</p></div>` : ""}
      <div class="section">
        <p>Make sure you've RSVP'd and reviewed your character assignment. This is going to be fun!</p>
      </div>
    `,
    ctaText: "Go to Party",
    ctaUrl: partyUrl,
  });
}
