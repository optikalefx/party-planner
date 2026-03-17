<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth, signInWithGoogle } from '$lib/auth.svelte';
  $effect(() => {
    if (!auth.isLoading && auth.token) {
      goto('/admin', { replaceState: true });
    }
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap" rel="stylesheet">
</svelte:head>

<!-- Fixed page border frame -->
<div class="page-frame"></div>

<div class="page">
  <div class="map-card">
    <div class="card-inner">
      <div class="hero">
        <div class="emblem">✦ &nbsp; ✦ &nbsp; ✦</div>
        <h1>Party Planner</h1>
        <div class="rule"></div>
        <p class="tagline">Themed parties, mystery characters,<br>and unforgettable guests.</p>
        <div class="actions">
          {#if auth.isLoading}
            <div class="loading">Loading…</div>
          {:else}
            <button class="btn-google" onclick={signInWithGoogle}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          {/if}
        </div>
      </div>
      <p class="hint">Have an invite? Enter the code from your invitation to join a party.</p>
    </div>
  </div>
</div>

<style>
  .page-frame {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    border: 14px solid #26244a;
    box-shadow:
      inset 0 0 0 5px #e8dcc0,
      inset 0 0 0 20px #cc4150,
      inset 0 0 0 25px #e8dcc0,
      inset 0 0 0 30px #26244a;
  }

  .page {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #42b8cc;
    background-image:
      linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
    background-size: 44px 44px;
    font-family: system-ui, sans-serif;
    padding: 80px 24px 24px;
  }

  /* Outer frame — thick navy band */
  .map-card {
    max-width: 460px;
    width: 100%;
    background: #0d2035;
    padding: 8px;
    box-shadow: 0 28px 72px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
    position: relative;
  }

  /* Inner frame — dashed red inset on parchment */
  .card-inner {
    background: #f0e3b2;
    border: 2px dashed #cc4150;
    padding: 52px 44px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    position: relative;
  }

  /* Corner dots */
  .card-inner::before,
  .card-inner::after {
    content: '✦';
    position: absolute;
    color: #cc4150;
    font-size: 0.65rem;
    opacity: 0.6;
  }
  .card-inner::before { top: 8px; left: 12px; }
  .card-inner::after  { bottom: 8px; right: 12px; }

  .hero {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 100%;
  }

  .emblem {
    color: #cc4150;
    font-size: 0.65rem;
    letter-spacing: 0.7em;
    text-indent: 0.7em;
    opacity: 0.65;
  }

  h1 {
    color: #160a02;
    font-size: clamp(2.4rem, 7vw, 3.4rem);
    font-weight: 900;
    margin: 0;
    letter-spacing: 0.06em;
    font-family: 'Cinzel', 'Georgia', serif;
    text-transform: uppercase;
    line-height: 1;
  }

  .rule {
    width: 72px;
    height: 2px;
    background: linear-gradient(to right, transparent, #cc4150 30%, #cc4150 70%, transparent);
  }

  .tagline {
    color: #4a2c10;
    font-size: 0.98rem;
    margin: 0;
    line-height: 1.65;
  }

  .actions {
    margin-top: 10px;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-google {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0d2035;
    border: 2px solid #d4a020;
    border-radius: 4px;
    color: #f0e3b2;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 12px 26px;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
    letter-spacing: 0.02em;
    font-family: inherit;
  }

  .btn-google:hover {
    background: #162d45;
    border-color: #f0c040;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }

  .loading {
    color: #7a6040;
    font-size: 1rem;
  }

  .hint {
    color: #7a5030;
    font-size: 0.8rem;
    margin: 0;
    text-align: center;
    font-style: italic;
    opacity: 0.8;
  }
</style>
