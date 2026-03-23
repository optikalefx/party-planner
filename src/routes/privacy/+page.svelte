<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Privacy Policy — Mystery Invite</title>
</svelte:head>

<div class="legal-page">
  <nav class="legal-nav">
    <button class="back-link" onclick={() => goto('/')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      Back to Home
    </button>
  </nav>

  <article class="legal-content">
    <p class="evidence-tag">CLASSIFIED DOCUMENT &bull; PRIVACY</p>
    <h1>Privacy Policy</h1>
    <p class="effective">Effective Date: March 22, 2026</p>

    <p>Mystery Invite ("we", "us", or "our") operates the Mystery Invite party-planning platform. This Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>

    <h2>1. Information We Collect</h2>
    <h3>Account Information</h3>
    <p>When you sign in with Google, we receive your name, email address, and profile picture from your Google account. This information is used to identify you as a host on the platform.</p>

    <h3>Party & Guest Data</h3>
    <p>We store party details you create (event name, date, location, dress code, theme), character information, guest names, guest phone numbers, RSVP responses, character preference rankings, and chat messages exchanged within party chat rooms.</p>

    <h3>Uploaded Content</h3>
    <p>If you upload images, PDFs, or other files (e.g., party invitations or character lists), we store those files to provide AI-powered parsing and theme generation features.</p>

    <h3>SMS & Notifications</h3>
    <p>If guests provide a phone number, we use it solely to send party-related SMS notifications (e.g., reminders, character assignments). We log these messages for delivery tracking.</p>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To create, manage, and display your murder mystery parties</li>
      <li>To facilitate guest RSVPs, character voting, and cast assignments</li>
      <li>To power AI features such as invite parsing, character extraction, and theme generation (via Anthropic's Claude API)</li>
      <li>To send SMS notifications and reminders to guests via Twilio</li>
      <li>To enable real-time chat between party guests</li>
    </ul>

    <h2>3. Third-Party Services</h2>
    <p>We rely on the following third-party services to operate:</p>
    <ul>
      <li><strong>Google OAuth</strong> — for host authentication</li>
      <li><strong>Convex</strong> — for database storage and real-time sync</li>
      <li><strong>Anthropic (Claude)</strong> — for AI-powered parsing and theme generation. Uploaded content may be sent to the Claude API for processing.</li>
      <li><strong>Twilio</strong> — for sending SMS notifications to guests</li>
    </ul>
    <p>Each of these services has its own privacy policy governing how they handle data.</p>

    <h2>4. Data Sharing</h2>
    <p>We do not sell your personal information. We share data only as needed with the third-party services listed above to provide our features, and with other guests in the same party (e.g., names, character assignments, and chat messages are visible to fellow party members).</p>

    <h2>5. Data Retention</h2>
    <p>We retain your data for as long as your account is active and your parties exist on the platform. If you delete a party, associated guest data, chat messages, and uploaded files are removed. You may request deletion of your account and all associated data by contacting us.</p>

    <h2>6. Security</h2>
    <p>We use industry-standard security measures including encrypted connections (HTTPS), OAuth-based authentication, and access controls that restrict admin functions to authenticated hosts. However, no method of electronic transmission or storage is 100% secure.</p>

    <h2>7. Children's Privacy</h2>
    <p>Mystery Invite is not directed at children under 13. We do not knowingly collect information from children under 13. If we become aware that we have collected data from a child under 13, we will delete it promptly.</p>

    <h2>8. Your Rights</h2>
    <p>Depending on your jurisdiction, you may have the right to access, correct, or delete the personal data we hold about you. To exercise these rights, please contact us using the information below.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.</p>

    <h2>10. Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please reach out to the Mystery Invite team through the platform.</p>
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

  .legal-content h3 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--on-surface);
    margin: 1.25rem 0 0.5rem;
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
