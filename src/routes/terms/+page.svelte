<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Terms and Conditions — Mystery Invite</title>
</svelte:head>

<div class="legal-page">
  <nav class="legal-nav">
    <button class="back-link" onclick={() => goto('/')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      Back to Home
    </button>
  </nav>

  <article class="legal-content">
    <p class="evidence-tag">CLASSIFIED DOCUMENT &bull; TERMS</p>
    <h1>Terms and Conditions</h1>
    <p class="effective">Effective Date: March 22, 2026</p>

    <p>Welcome to Mystery Invite. By accessing or using our platform, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree, please do not use the service.</p>

    <h2>1. Overview</h2>
    <p>Mystery Invite is a party-planning platform that helps hosts organize murder mystery events. Features include party creation, guest management, character assignment via ranked-choice voting, real-time chat, AI-powered content parsing, and SMS notifications.</p>

    <h2>2. Eligibility</h2>
    <p>You must be at least 13 years old to use Mystery Invite. By using the service, you represent that you meet this age requirement.</p>

    <h2>3. Accounts</h2>
    <p>Hosts sign in using Google OAuth. You are responsible for maintaining the security of your Google account credentials. You are responsible for all activity that occurs under your account on Mystery Invite.</p>

    <h2>4. Acceptable Use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Use the platform for any unlawful purpose</li>
      <li>Upload content that is obscene, defamatory, or infringes on the rights of others</li>
      <li>Harass, threaten, or abuse other users through the chat feature</li>
      <li>Attempt to gain unauthorized access to other users' accounts or parties</li>
      <li>Use automated scripts, bots, or scrapers to access the platform</li>
      <li>Interfere with or disrupt the service or its infrastructure</li>
    </ul>

    <h2>5. User Content</h2>
    <p>You retain ownership of content you upload (images, text, files). By uploading content to Mystery Invite, you grant us a limited, non-exclusive license to store, process, and display that content as needed to provide the service — including sending it to third-party AI services for parsing and theme generation.</p>
    <p>You are solely responsible for ensuring you have the right to upload and share any content you provide.</p>

    <h2>6. AI-Generated Content</h2>
    <p>Mystery Invite uses Anthropic's Claude API to generate themes, parse invitations, and extract character information. AI-generated content is provided "as-is" and may not always be accurate. You are responsible for reviewing and editing AI-generated content before sharing it with guests.</p>

    <h2>7. SMS Notifications</h2>
    <p>By providing a phone number (yours or a guest's), you consent to receiving party-related SMS messages via Twilio. Standard messaging rates may apply. Hosts are responsible for obtaining appropriate consent before adding guest phone numbers to the platform.</p>

    <h2>8. Intellectual Property</h2>
    <p>The Mystery Invite platform, including its design, code, and branding, is the property of Mystery Invite. You may not copy, modify, or distribute any part of the platform without prior written consent.</p>

    <h2>9. Disclaimer of Warranties</h2>
    <p>Mystery Invite is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not guarantee that the service will be uninterrupted, error-free, or secure. We make no warranties regarding the accuracy of AI-generated content.</p>

    <h2>10. Limitation of Liability</h2>
    <p>To the fullest extent permitted by law, Mystery Invite and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to loss of data, loss of profits, or damages resulting from AI-generated content.</p>

    <h2>11. Termination</h2>
    <p>We reserve the right to suspend or terminate your access to Mystery Invite at any time, for any reason, without prior notice. You may stop using the service at any time.</p>

    <h2>12. Changes to These Terms</h2>
    <p>We may update these Terms from time to time. Continued use of the platform after changes are posted constitutes your acceptance of the revised Terms.</p>

    <h2>13. Governing Law</h2>
    <p>These Terms are governed by and construed in accordance with applicable law, without regard to conflict of law principles.</p>

    <h2>14. Contact</h2>
    <p>If you have questions about these Terms, please reach out to the Mystery Invite team through the platform.</p>
  </article>
</div>

<style>
  .legal-page {
    min-height: 100vh;
    background: var(--surface-dim);
    padding: 2rem 1.25rem 4rem;
  }

  .legal-nav {
    max-width: 700px;
    margin: 0 auto 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--secondary);
    font-family: var(--font-body);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .back-link:hover {
    opacity: 1;
  }

  .evidence-tag {
    font-family: var(--font-evidence);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    color: var(--secondary);
    margin: 0 0 1rem;
    opacity: 0.9;
  }

  .legal-content {
    max-width: 700px;
    margin: 0 auto;
  }

  .legal-content h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--on-surface);
    margin: 0 0 0.5rem;
  }

  .effective {
    font-size: 0.8rem;
    color: var(--on-surface-muted);
    margin: 0 0 2rem;
  }

  .legal-content h2 {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--on-surface);
    margin: 2rem 0 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--outline-variant);
  }

  .legal-content p {
    font-size: 0.875rem;
    color: var(--on-surface-muted);
    line-height: 1.7;
    margin: 0 0 0.75rem;
  }

  .legal-content ul {
    margin: 0 0 0.75rem;
    padding-left: 1.25rem;
  }

  .legal-content li {
    font-size: 0.875rem;
    color: var(--on-surface-muted);
    line-height: 1.7;
    margin-bottom: 0.25rem;
  }

  .legal-content strong {
    color: var(--on-surface);
    font-weight: 600;
  }

  @media (min-width: 640px) {
    .legal-page {
      padding: 3rem 2.5rem 5rem;
    }

    .legal-content h1 {
      font-size: 2.4rem;
    }
  }
</style>
