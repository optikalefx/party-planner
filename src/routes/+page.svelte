<div class="page">
  <div class="hero">
    <div class="emoji-row">🎭 🎉 🥂 🎊 🕵️</div>
    <h1>Party Planner</h1>
    <p class="tagline">Themed parties, mystery characters, and unforgettable guests.</p>
    <div class="actions">
      <a class="btn-admin" href="/admin/login">Admin →</a>
    </div>
  </div>
  <p class="hint">Have an invite? Enter the code from your invitation to join a party.</p>
</div>

<style>
  .page {
    position: fixed;
    inset: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0f0f1a;
    font-family: system-ui, sans-serif;
    padding: 24px;
    gap: 48px;
  }

  .hero {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .emoji-row {
    font-size: 2rem;
    letter-spacing: 0.1em;
  }

  h1 {
    color: #fff;
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .tagline {
    color: #888;
    font-size: 1.1rem;
    margin: 0;
    max-width: 420px;
  }

  .actions {
    margin-top: 8px;
    display: flex;
    gap: 12px;
  }

  .btn-admin {
    background: #7c6af7;
    border-radius: 10px;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    padding: 12px 28px;
    text-decoration: none;
    transition: background 0.15s;
  }

  .btn-admin:hover {
    background: #6b58e8;
  }

  .hint {
    color: #555;
    font-size: 0.85rem;
    margin: 0;
    text-align: center;
  }
</style>
