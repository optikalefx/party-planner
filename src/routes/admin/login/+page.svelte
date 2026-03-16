<script lang="ts">
  import { useConvexClient } from "convex-svelte";
  import { api } from "../../../convex/_generated/api";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  const client = useConvexClient();

  let username = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  onMount(() => {
    if (sessionStorage.getItem("adminAuthed") === "1") {
      goto("/admin", { replaceState: true });
    }
  });

  async function login(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = "";
    try {
      const ok = await client.action(api.auth.validateAdmin, { username, password });
      if (ok) {
        sessionStorage.setItem("adminAuthed", "1");
        goto("/admin", { replaceState: true });
      } else {
        error = "Invalid username or password.";
      }
    } catch {
      error = "Something went wrong. Try again.";
    } finally {
      loading = false;
    }
  }
</script>

<div class="page">
  <div class="card">
    <div class="logo">🎉</div>
    <h1>Admin Login</h1>
    <form onsubmit={login}>
      <label>
        Username
        <input type="text" bind:value={username} autocomplete="username" required />
      </label>
      <label>
        Password
        <input type="password" bind:value={password} autocomplete="current-password" required />
      </label>
      {#if error}
        <p class="error">{error}</p>
      {/if}
      <button type="submit" disabled={loading}>
        {loading ? "Checking…" : "Sign In"}
      </button>
    </form>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0f1a;
    font-family: system-ui, sans-serif;
  }

  .card {
    background: #1a1a2e;
    border: 1px solid #2a2a4a;
    border-radius: 16px;
    padding: 48px 40px;
    width: 100%;
    max-width: 360px;
    text-align: center;
  }

  .logo {
    font-size: 48px;
    margin-bottom: 12px;
  }

  h1 {
    color: #fff;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 32px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    color: #aaa;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  input {
    background: #0f0f1a;
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    padding: 10px 12px;
    outline: none;
    transition: border-color 0.15s;
  }

  input:focus {
    border-color: #7c6af7;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    margin: 0;
  }

  button {
    background: #7c6af7;
    border: none;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    margin-top: 8px;
    padding: 12px;
    transition: background 0.15s, opacity 0.15s;
  }

  button:hover:not(:disabled) {
    background: #6b58e8;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
