<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth, signInWithGoogle } from '$lib/auth.svelte';
  $effect(() => {
    if (!auth.isLoading && auth.token) {
      goto('/admin', { replaceState: true });
    }
  });
</script>

<div class="page">

  <!-- ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <section class="hero">
    <div class="hero-bg">
      <img src="/hero-desk.png" alt="" class="hero-photo" />
      <div class="hero-overlay"></div>
    </div>
    <div class="hero-content">
      <img src="/logo.png" alt="Mystery Invite" class="hero-seal" />
      <p class="evidence-tag">CASE FILE NO. 2026-MYS &bull; CLASSIFIED</p>
      <h1>You've Been<br>Cordially Invited<br>to a <em>Murder.</em></h1>
      <p class="hero-sub">Mystery Invite is where hosts craft unforgettable murder mystery experiences &mdash; from themed characters to ranked-choice casting, all the way to the big reveal.</p>
      <div class="hero-actions">
        {#if auth.isLoading}
          <span class="loading-text">VERIFYING CLEARANCE...</span>
        {:else}
          <button class="btn-seal" onclick={signInWithGoogle}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity="0.7"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.5"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity="0.6"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.8"/>
            </svg>
            Host a Mystery
          </button>
          <span class="hero-hint">Have an invite code? Sign in to join.</span>
        {/if}
      </div>
    </div>
  </section>

  <!-- ━━ Murder Board ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <section class="board">
    <div class="board-header">
      <p class="section-tag">THE BRIEF</p>
      <h2 class="section-heading">Every great mystery<br>needs a <em>plan.</em></h2>
    </div>
    <div class="board-surface">
      <!-- Red string SVG connecting the cards -->
      <svg class="red-string" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 200 130 Q 400 80 600 130" fill="none" stroke="#722F37" stroke-width="1.5" opacity="0.6"/>
        <path d="M 200 130 Q 200 280 200 430" fill="none" stroke="#722F37" stroke-width="1.5" opacity="0.6"/>
        <path d="M 600 130 Q 600 280 600 430" fill="none" stroke="#722F37" stroke-width="1.5" opacity="0.6"/>
        <path d="M 200 430 Q 400 380 600 430" fill="none" stroke="#722F37" stroke-width="1.5" opacity="0.6"/>
      </svg>

      <div class="board-grid">
        <div class="pinned-note note-1">
          <div class="pushpin"></div>
          <span class="note-num">01</span>
          <h3>Open the Case</h3>
          <p>Create your event with all the essentials &mdash; date, venue, dress code. Upload a party invite and Claude reads every detail for you.</p>
        </div>
        <div class="pinned-note note-2">
          <div class="pushpin"></div>
          <span class="note-num">02</span>
          <h3>Assemble the Suspects</h3>
          <p>Add mystery characters with backstories, or paste in a list &mdash; AI extracts names and descriptions from text or photos.</p>
        </div>
        <div class="pinned-note note-3">
          <div class="pushpin"></div>
          <span class="note-num">03</span>
          <h3>Send the Invitations</h3>
          <p>Share a unique invite link. Guests RSVP, browse the cast, and rank which characters they want to play.</p>
        </div>
        <div class="pinned-note note-4">
          <div class="pushpin"></div>
          <span class="note-num">04</span>
          <h3>Reveal the Cast</h3>
          <p>The ranked-choice algorithm assigns characters fairly. Or override it &mdash; you're the host, after all. Real-time chat keeps the scheming alive.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ━━ Evidence Wall (Features) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <section class="evidence">
    <div class="evidence-header">
      <p class="section-tag">THE EVIDENCE</p>
      <h2 class="section-heading">Built for hosts who<br>mean <em>business.</em></h2>
    </div>
    <div class="wall">
      <!-- Red string SVG -->
      <svg class="wall-string" aria-hidden="true" preserveAspectRatio="none">
        <line x1="18%" y1="22%" x2="50%" y2="28%" stroke="#722F37" stroke-width="1" opacity="0.5"/>
        <line x1="50%" y1="28%" x2="82%" y2="20%" stroke="#722F37" stroke-width="1" opacity="0.5"/>
        <line x1="18%" y1="22%" x2="22%" y2="72%" stroke="#722F37" stroke-width="1" opacity="0.5"/>
        <line x1="82%" y1="20%" x2="78%" y2="68%" stroke="#722F37" stroke-width="1" opacity="0.5"/>
        <line x1="22%" y1="72%" x2="50%" y2="78%" stroke="#722F37" stroke-width="1" opacity="0.5"/>
        <line x1="50%" y1="78%" x2="78%" y2="68%" stroke="#722F37" stroke-width="1" opacity="0.5"/>
      </svg>

      <div class="polaroids">
        <div class="polaroid p1">
          <div class="polaroid-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="polaroid-pin"></div>
          <h3>Ranked-Choice Voting</h3>
          <p>Guests rank characters. The algorithm assigns fairly &mdash; no arguments at the door.</p>
        </div>
        <div class="polaroid p2">
          <div class="polaroid-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="polaroid-pin"></div>
          <h3>Real-Time Chat</h3>
          <p>In-character banter, scheming, and emoji reactions. Instant updates for all guests.</p>
        </div>
        <div class="polaroid p3">
          <div class="polaroid-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div class="polaroid-pin"></div>
          <h3>AI Themes</h3>
          <p>Describe a vibe or upload a photo. Claude generates a custom visual theme.</p>
        </div>
        <div class="polaroid p4">
          <div class="polaroid-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="polaroid-pin"></div>
          <h3>Invite Parsing</h3>
          <p>Upload a PDF or photo. AI fills in every detail &mdash; date, location, dress code.</p>
        </div>
        <div class="polaroid p5">
          <div class="polaroid-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </div>
          <div class="polaroid-pin"></div>
          <h3>The Detective</h3>
          <p>A special role outside the voting pool. Guests volunteer to investigate.</p>
        </div>
        <div class="polaroid p6">
          <div class="polaroid-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div class="polaroid-pin"></div>
          <h3>Host-Only Admin</h3>
          <p>Google OAuth locks admin to you. Guests see only the party page.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ━━ CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <section class="cta">
    <div class="cta-card">
      <p class="evidence-tag">URGENT &bull; EYES ONLY</p>
      <h2>The case is open.<br>Are you <em>in?</em></h2>
      <p class="cta-body">Create your first mystery party in under a minute. No credit card, no strings attached &mdash; just suspense.</p>
      {#if !auth.isLoading}
        <button class="btn-seal" onclick={signInWithGoogle}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity="0.7"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.5"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity="0.6"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.8"/>
          </svg>
          Get Started
        </button>
      {/if}
    </div>
  </section>

  <!-- ━━ Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <footer class="site-footer">
    <div class="footer-inner">
      <img src="/logo.png" alt="" class="footer-seal" />
      <span class="footer-name">Mystery Invite</span>
      <span class="footer-sep">&mdash;</span>
      <span class="footer-tech">Built with SvelteKit, Convex &amp; Claude</span>
    </div>
    <div class="footer-legal">
      <a href="/privacy">Privacy Policy</a>
      <span class="footer-dot">&bull;</span>
      <a href="/terms">Terms &amp; Conditions</a>
    </div>
  </footer>
</div>

<style>
  /* ── Reset ── */
  .page {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--surface-dim);
    overflow-x: hidden;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     HERO
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  .hero {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: flex-end;
    padding: 0 1.25rem 3.5rem;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .hero-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 40%;
    display: block;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to bottom, rgba(14,15,26,0.3) 0%, rgba(14,15,26,0.55) 40%, rgba(14,15,26,0.92) 75%, var(--surface-dim) 100%),
      linear-gradient(to right, rgba(14,15,26,0.6) 0%, transparent 60%);
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 600px;
  }

  .hero-seal {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 1.25rem;
    box-shadow: 0 4px 30px rgba(114, 47, 55, 0.4);
  }

  .evidence-tag {
    font-family: var(--font-evidence);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    color: var(--secondary);
    margin: 0 0 1rem;
    opacity: 0.9;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 2.4rem;
    font-weight: 700;
    color: var(--on-surface);
    margin: 0 0 1.25rem;
    line-height: 1.15;
  }

  h1 em {
    font-style: italic;
    color: var(--primary-light);
  }

  .hero-sub {
    font-size: 0.9rem;
    color: var(--on-surface-muted);
    line-height: 1.7;
    margin: 0 0 2rem;
    max-width: 440px;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .hero-hint {
    font-size: 0.78rem;
    color: var(--on-surface-faint);
    font-style: italic;
  }

  .loading-text {
    font-family: var(--font-evidence);
    font-size: 0.75rem;
    color: var(--secondary);
    letter-spacing: 0.1em;
  }

  /* ── Shared Button ── */
  .btn-seal {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, var(--primary), var(--primary-container));
    border: 1px solid rgba(201, 169, 110, 0.2);
    border-radius: 2px;
    color: var(--on-surface);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 14px 28px;
    letter-spacing: 0.04em;
    transition: filter 0.2s, transform 0.1s, border-color 0.2s;
  }

  .btn-seal:hover {
    filter: brightness(1.2);
    transform: translateY(-1px);
    border-color: rgba(201, 169, 110, 0.4);
  }

  .btn-seal:active { transform: translateY(0); }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     MURDER BOARD
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  .board {
    padding: 5rem 1.25rem 0;
  }

  .board-header {
    max-width: 600px;
    margin: 0 auto 2rem;
  }

  .section-tag {
    font-family: var(--font-evidence);
    font-size: 0.65rem;
    letter-spacing: 0.18em;
    color: var(--secondary);
    margin: 0 0 0.75rem;
  }

  .section-heading {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--on-surface);
    margin: 0;
    line-height: 1.2;
  }

  .section-heading em {
    font-style: italic;
    color: var(--secondary-light);
  }

  .board-surface {
    position: relative;
    background: url('/cork-board.jpg') center / cover no-repeat;
    border-radius: 3px;
    padding: 2.5rem 1.25rem;
    max-width: 860px;
    margin: 0 auto;
    box-shadow:
      inset 0 0 80px rgba(0,0,0,0.5),
      0 4px 30px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  /* Dark vignette overlay on the cork */
  .board-surface::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%);
    pointer-events: none;
    z-index: 1;
  }

  .red-string {
    display: none;
  }

  .board-grid {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .pinned-note {
    position: relative;
    background: #faf6ed;
    padding: 1.75rem 1.5rem 1.5rem;
    box-shadow:
      2px 3px 8px rgba(0,0,0,0.25),
      0 1px 2px rgba(0,0,0,0.15);
    color: #2a1e12;
  }

  /* Slight rotation on alternating cards for that tacked-on feel */
  .note-1 { transform: rotate(-1.2deg); }
  .note-2 { transform: rotate(0.8deg); }
  .note-3 { transform: rotate(-0.5deg); }
  .note-4 { transform: rotate(1.1deg); }

  /* Pushpin */
  .pushpin {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #d44040, #8b1a1a);
    box-shadow:
      0 2px 4px rgba(0,0,0,0.4),
      inset 0 1px 2px rgba(255,255,255,0.3);
    z-index: 3;
  }

  .pushpin::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 4px;
    background: #666;
    border-radius: 0 0 1px 1px;
  }

  .note-num {
    font-family: var(--font-evidence);
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    color: #8b6940;
    display: block;
    margin-bottom: 0.5rem;
  }

  .pinned-note h3 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: #1a0e04;
    margin: 0 0 0.4rem;
  }

  .pinned-note p {
    font-size: 0.825rem;
    color: #5a4030;
    margin: 0;
    line-height: 1.6;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     EVIDENCE WALL (Polaroids)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  .evidence {
    padding: 5rem 1.25rem;
  }

  .evidence-header {
    max-width: 600px;
    margin: 0 auto 2.5rem;
  }

  .wall {
    position: relative;
    max-width: 900px;
    margin: 0 auto;
    background: url('/cork-board.jpg') center / cover no-repeat;
    border-radius: 3px;
    padding: 2rem 1.25rem;
    box-shadow:
      inset 0 0 80px rgba(0,0,0,0.5),
      0 4px 30px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  .wall::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.4) 100%);
    pointer-events: none;
    z-index: 1;
  }

  .wall-string {
    display: none;
  }

  .polaroids {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }

  /* ── Polaroid card ── */
  .polaroid {
    background: #faf6ed;
    padding: 1rem 1rem 1.25rem;
    box-shadow:
      2px 3px 10px rgba(0,0,0,0.3),
      0 1px 2px rgba(0,0,0,0.15);
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .polaroid:hover {
    z-index: 3;
    box-shadow:
      4px 6px 20px rgba(0,0,0,0.4),
      0 2px 4px rgba(0,0,0,0.2);
  }

  /* Slight rotations */
  .p1 { transform: rotate(-1.5deg); }
  .p2 { transform: rotate(1.2deg); }
  .p3 { transform: rotate(-0.8deg); }
  .p4 { transform: rotate(1.8deg); }
  .p5 { transform: rotate(-1.1deg); }
  .p6 { transform: rotate(0.6deg); }

  .p1:hover { transform: rotate(0deg) scale(1.03); }
  .p2:hover { transform: rotate(0deg) scale(1.03); }
  .p3:hover { transform: rotate(0deg) scale(1.03); }
  .p4:hover { transform: rotate(0deg) scale(1.03); }
  .p5:hover { transform: rotate(0deg) scale(1.03); }
  .p6:hover { transform: rotate(0deg) scale(1.03); }

  /* Pushpin */
  .polaroid-pin {
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #d44040, #8b1a1a);
    box-shadow:
      0 2px 4px rgba(0,0,0,0.4),
      inset 0 1px 2px rgba(255,255,255,0.3);
    z-index: 4;
  }

  /* Icon area — like the "photo" part of the polaroid */
  .polaroid-icon {
    background: linear-gradient(135deg, #e8ddd0, #d8ccb8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    margin-bottom: 0.75rem;
    color: #6a5040;
  }

  /* Caption area */
  .polaroid h3 {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: #1a0e04;
    margin: 0 0 0.3rem;
    line-height: 1.2;
  }

  .polaroid p {
    font-size: 0.75rem;
    color: #5a4530;
    margin: 0;
    line-height: 1.55;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     CTA
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  .cta {
    padding: 3rem 1.25rem 5rem;
  }

  .cta-card {
    max-width: 600px;
    margin: 0 auto;
    background:
      var(--surface);
    border: 1px solid var(--outline-variant);
    border-radius: 2px;
    padding: 2.5rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .cta-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(to bottom, var(--primary), var(--secondary-dim));
  }

  .cta-card h2 {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--on-surface);
    margin: 0 0 1rem;
    line-height: 1.2;
  }

  .cta-card h2 em {
    font-style: italic;
    color: var(--primary-light);
  }

  .cta-body {
    font-size: 0.875rem;
    color: var(--on-surface-muted);
    margin: 0 0 1.75rem;
    line-height: 1.65;
    max-width: 380px;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     FOOTER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  .site-footer {
    padding: 0 1.25rem 2.5rem;
  }

  .footer-inner {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .footer-seal {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    opacity: 0.4;
  }

  .footer-name {
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--on-surface);
    opacity: 0.25;
  }

  .footer-sep {
    color: var(--on-surface);
    opacity: 0.1;
    font-size: 0.75rem;
  }

  .footer-tech {
    font-size: 0.7rem;
    color: var(--on-surface);
    opacity: 0.15;
  }

  .footer-legal {
    max-width: 600px;
    margin: 0.75rem auto 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .footer-legal a {
    font-size: 0.7rem;
    color: var(--on-surface);
    opacity: 0.25;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .footer-legal a:hover {
    opacity: 0.5;
  }

  .footer-dot {
    font-size: 0.5rem;
    color: var(--on-surface);
    opacity: 0.15;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     DESKTOP BREAKPOINTS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  @media (min-width: 640px) {
    .hero {
      padding: 0 2.5rem 5rem;
    }

    h1 {
      font-size: 3.2rem;
    }

    .hero-seal {
      width: 80px;
      height: 80px;
    }

    .board, .evidence, .cta {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }

    .board-header, .evidence-header, .cta-card, .footer-inner {
      max-width: 680px;
    }

    .wall {
      padding: 2.5rem;
    }

    .polaroids {
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1.5rem;
    }

    .wall-string {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      pointer-events: none;
    }

    .board-surface {
      padding: 3rem 2.5rem;
    }

    .board-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .red-string {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      pointer-events: none;
    }

    .section-heading {
      font-size: 2.2rem;
    }

    .evidence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
    }

    .cta-card {
      padding: 3rem 2.5rem;
    }
  }

  @media (min-width: 960px) {
    .hero {
      padding: 0 3rem 6rem;
      align-items: center;
    }

    .hero-content {
      max-width: 560px;
      padding: 2rem 0;
    }

    h1 {
      font-size: clamp(3.2rem, 4vw, 3.8rem);
    }

    .board-header, .evidence-header, .cta-card, .footer-inner {
      max-width: 800px;
    }

    .wall {
      padding: 3rem;
    }

    .board-surface {
      max-width: 900px;
      padding: 3.5rem 3rem;
    }

    .board-grid {
      gap: 2.5rem;
    }

    .section-heading {
      font-size: 2.5rem;
    }
  }
</style>
