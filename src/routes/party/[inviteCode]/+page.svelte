<script lang="ts">
  import { useQuery, useConvexClient } from "convex-svelte";
  import { api } from "../../../convex/_generated/api";
  import type { Id } from "../../../convex/_generated/dataModel";
  import { page } from "$app/stores";
  import { tallyFirstChoices } from "$lib/rcv";
  import { onMount } from "svelte";

  const client = useConvexClient();
  const inviteCode = $derived($page.params.inviteCode.toUpperCase());

  // ── Queries ──────────────────────────────────────────────────────────────────
  const partyQuery = useQuery(api.parties.getByInviteCode, () => ({ inviteCode }));

  const party = $derived(partyQuery.data);
  const partyId = $derived(party?._id ?? null);

  const guestsQuery = useQuery(
    api.guests.listByParty,
    () => (partyId ? { partyId } : "skip")
  );

  const charactersQuery = useQuery(
    api.characters.listByParty,
    () => (partyId ? { partyId } : "skip")
  );

  const votesQuery = useQuery(
    api.votes.listByParty,
    () => (partyId ? { partyId } : "skip")
  );

  const guests = $derived(guestsQuery.data ?? []);
  const characters = $derived(charactersQuery.data ?? []);
  const votes = $derived(votesQuery.data ?? []);

  // ── Guest identity ───────────────────────────────────────────────────────────
  let guestName = $state("");
  let identifiedName = $state<string | null>(null);

  // Persist identity in localStorage so it survives page closes
  onMount(() => {
    const saved = localStorage.getItem(`party-${inviteCode}-name`);
    if (saved) identifiedName = saved;
  });

  function identify() {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    identifiedName = trimmed;
    localStorage.setItem(`party-${inviteCode}-name`, trimmed);
  }

  // ── RSVP ─────────────────────────────────────────────────────────────────────
  let rsvpStatus = $state<"yes" | "no" | "pending">("pending");
  let plusOne = $state("");
  let rsvpSaving = $state(false);
  let rsvpDone = $state(false);

  const myGuest = $derived(
    identifiedName ? guests.find((g) => g.name.toLowerCase() === identifiedName!.toLowerCase()) : null
  );

  $effect(() => {
    if (myGuest) {
      rsvpStatus = myGuest.rsvpStatus;
      plusOne = myGuest.plusOne ?? "";
      rsvpDone = myGuest.rsvpStatus !== "pending";
    }
  });

  async function submitRsvp() {
    if (!partyId || !identifiedName) return;
    rsvpSaving = true;
    try {
      await client.mutation(api.guests.upsertRsvp, {
        partyId,
        name: identifiedName,
        rsvpStatus,
        plusOne: plusOne.trim() || undefined,
      });
      rsvpDone = true;
    } finally {
      rsvpSaving = false;
    }
  }

  async function selectRsvpStatus(status: "yes" | "no") {
    rsvpStatus = status;
    if (status === "no") plusOne = "";
    await submitRsvp();
  }

  // ── Voting ───────────────────────────────────────────────────────────────────
  let wantsDetective = $state(false);
  let rankings = $state<Id<"characters">[]>([]); // ordered by preference
  let voteSaving = $state(false);
  let voteDone = $state(false);

  const myVote = $derived(
    identifiedName
      ? votes.find((v) => v.guestName.toLowerCase() === identifiedName!.toLowerCase())
      : null
  );

  $effect(() => {
    if (myVote) {
      wantsDetective = myVote.wantsDetective;
      rankings = [...myVote.rankings] as Id<"characters">[];
      voteDone = true;
    }
  });

  function toggleRanking(charId: Id<"characters">) {
    if (wantsDetective) return;
    const idx = rankings.indexOf(charId);
    if (idx >= 0) {
      rankings = rankings.filter((id) => id !== charId);
    } else if (rankings.length < 3) {
      rankings = [...rankings, charId];
    }
  }

  function rankLabel(charId: Id<"characters">) {
    const idx = rankings.indexOf(charId);
    return idx >= 0 ? idx + 1 : null;
  }

  async function submitVote() {
    if (!partyId || !identifiedName) return;
    if (!wantsDetective && rankings.length === 0) return;
    voteSaving = true;
    try {
      await client.mutation(api.votes.submitVote, {
        partyId,
        guestName: identifiedName,
        rankings: wantsDetective ? [] : rankings,
        wantsDetective,
      });
      voteDone = true;
    } finally {
      voteSaving = false;
    }
  }

  // ── Vote standings ───────────────────────────────────────────────────────────
  const firstChoiceTally = $derived(() => {
    if (!votableCharacters.length || !votes.length) return new Map<string, number>();
    return tallyFirstChoices(
      votes.map((v) => ({
        guestName: v.guestName,
        rankings: v.rankings as string[],
        wantsDetective: v.wantsDetective,
      })),
      votableCharacters.map((c) => c._id as string)
    );
  });

  const detectiveCount = $derived(votes.filter((v) => v.wantsDetective).length);

  // ── Theme injection ──────────────────────────────────────────────────────────
  onMount(() => {
    if (party?.theme?.css) {
      const style = document.createElement("style");
      style.id = "party-theme";
      style.textContent = party.theme.css;
      document.head.appendChild(style);
      return () => document.getElementById("party-theme")?.remove();
    }
  });

  // Re-apply if theme changes (after generation)
  $effect(() => {
    const css = party?.theme?.css;
    const existing = document.getElementById("party-theme");
    if (css && existing) {
      existing.textContent = css;
    } else if (css && !existing) {
      const style = document.createElement("style");
      style.id = "party-theme";
      style.textContent = css;
      document.head.appendChild(style);
    }
  });

  const rsvpYes = $derived(guests.filter((g) => g.rsvpStatus === "yes"));
  const rsvpNo = $derived(guests.filter((g) => g.rsvpStatus === "no"));
  const rsvpPending = $derived(guests.filter((g) => g.rsvpStatus === "pending"));

  // Characters manually assigned to a guest are removed from voting
  const assignedCharacterIds = $derived(
    new Set(guests.map((g) => g.assignedCharacterId).filter(Boolean) as string[])
  );
  const votableCharacters = $derived(
    characters.filter((c) => !assignedCharacterIds.has(c._id as string))
  );
  // Map from characterId -> guest name for display on assigned cards
  const assignedCharacterMap = $derived(
    new Map(
      guests
        .filter((g) => g.assignedCharacterId && g.assignedCharacterId !== "detective")
        .map((g) => [g.assignedCharacterId!, g.name])
    )
  );

  // Mobile nav tab
  let mobileTab = $state<"details" | "people" | "rsvp" | "characters">("details");

  const myAssignment = $derived(myGuest?.assignedCharacterId ?? null);
  const myAssignedCharacterName = $derived(() => {
    if (!myAssignment) return null;
    if (myAssignment === "detective") return "🕵️ The Detective";
    return characters.find((c) => c._id === myAssignment)?.name ?? null;
  });
</script>

<svelte:head>
  <title>{party?.name ?? "Party"}</title>
</svelte:head>

{#if partyQuery.isLoading}
  <div class="loading">Loading...</div>
{:else if !party}
  <div class="not-found">
    <h1>Party not found</h1>
    <p>The invite code <code>{inviteCode}</code> doesn't match any party.</p>
  </div>
{:else}
  <div class="party-page">

    <!-- Header decoration (Claude-generated) -->
    {#if party.theme?.headerHtml}
      <div class="party-header-deco">
        {@html party.theme.headerHtml}
      </div>
    {/if}

    <!-- Hero -->
    <div class="party-hero">
      <h1 class="party-title">{party.name}</h1>
      {#if party.date || party.time}
        <p class="party-subtitle">{party.date ?? ""}{party.date && party.time ? " · " : ""}{party.time ?? ""}</p>
      {/if}
    </div>

    <main class="party-main">

      <!-- Party Details -->
      <section class="party-section party-details" class:mobile-hidden={mobileTab !== "details"}>
        <h2 class="section-title">Details</h2>
        <div class="details-grid">
          {#if party.location}
            <div class="detail-row">
              <span class="detail-label">📍 Place</span>
              <span>{party.location}</span>
            </div>
          {/if}
          {#if party.time}
            <div class="detail-row">
              <span class="detail-label">🕗 When</span>
              <span>{party.time}{party.date ? `, ${party.date}` : ""}</span>
            </div>
          {/if}
          {#if party.food}
            <div class="detail-row">
              <span class="detail-label">🍽 Food</span>
              <span>{party.food}</span>
            </div>
          {/if}
          {#if party.drinks}
            <div class="detail-row">
              <span class="detail-label">🥂 Drinks</span>
              <span>{party.drinks}</span>
            </div>
          {/if}
          {#if party.dress}
            <div class="detail-row">
              <span class="detail-label">👗 Dress</span>
              <span>{party.dress}</span>
            </div>
          {/if}
          {#if party.notes}
            <div class="detail-row full">
              <span class="detail-label">📝 Notes</span>
              <span>{party.notes}</span>
            </div>
          {/if}
        </div>
      </section>

      <!-- Who's Coming -->
      <section class="party-section party-guests" class:mobile-hidden={mobileTab !== "people"}>
        <h2 class="section-title">Who's Coming</h2>
        {#if !guests.length}
          <p class="party-muted">No RSVPs yet — be the first!</p>
        {:else}
          <div class="guest-groups">
            {#if rsvpYes.length}
              <div>
                <h3 class="guest-group-label">✓ Coming ({rsvpYes.length})</h3>
                <div class="guest-chips">
                  {#each rsvpYes as g}
                    <span class="guest-chip yes">{g.name}{g.plusOne ? ` +${g.plusOne}` : ""}</span>
                  {/each}
                </div>
              </div>
            {/if}
            {#if rsvpNo.length}
              <div>
                <h3 class="guest-group-label">✗ Can't make it ({rsvpNo.length})</h3>
                <div class="guest-chips">
                  {#each rsvpNo as g}
                    <span class="guest-chip no">{g.name}</span>
                  {/each}
                </div>
              </div>
            {/if}
            {#if rsvpPending.length}
              <div>
                <h3 class="guest-group-label">? Pending ({rsvpPending.length})</h3>
                <div class="guest-chips">
                  {#each rsvpPending as g}
                    <span class="guest-chip pending">{g.name}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </section>

      <!-- RSVP -->
      <section class="party-section party-rsvp" class:mobile-hidden={mobileTab !== "rsvp"}>
        <h2 class="section-title">RSVP</h2>

        {#if !identifiedName}
          <div class="identify-form">
            <p class="party-muted">Enter your name to RSVP and vote for a character.</p>
            <div class="form-group">
              <label class="party-label" for="guest-name">Your Name</label>
              <input
                id="guest-name"
                class="party-input"
                type="text"
                bind:value={guestName}
                placeholder="First and last name"
                onkeydown={(e) => e.key === "Enter" && identify()}
              />
            </div>
            <button class="party-btn party-btn-primary" onclick={identify} disabled={!guestName.trim()}>
              Continue
            </button>
          </div>
        {:else}
          <div class="rsvp-form">
            <p class="rsvp-greeting">Hi, <strong>{identifiedName}</strong>! <button class="btn-link" onclick={() => { identifiedName = null; guestName = ""; }}>Not you?</button></p>

            <div class="rsvp-options">
              <button
                class="rsvp-btn {rsvpStatus === 'yes' ? 'active' : ''}"
                onclick={() => selectRsvpStatus("yes")}
                disabled={rsvpSaving}
              >{rsvpSaving && rsvpStatus === 'yes' ? 'Saving…' : '✓ I\'ll be there!'}</button>
              <button
                class="rsvp-btn {rsvpStatus === 'no' ? 'active no' : ''}"
                onclick={() => selectRsvpStatus("no")}
                disabled={rsvpSaving}
              >{rsvpSaving && rsvpStatus === 'no' ? 'Saving…' : '✗ Can\'t make it'}</button>
            </div>

            {#if rsvpStatus === "yes"}
              <div class="form-group">
                <label class="party-label" for="plus-one">Bringing a +1? (enter their name)</label>
                <input
                  id="plus-one"
                  class="party-input"
                  type="text"
                  bind:value={plusOne}
                  placeholder="Leave blank if coming solo"
                  onblur={submitRsvp}
                />
              </div>
            {/if}

            {#if rsvpDone}
              <p class="success-note">✓ RSVP saved!</p>
            {/if}
          </div>
        {/if}
      </section>

      <!-- Characters & Voting -->
      {#if characters.length > 0}
        <section class="party-section party-characters" class:mobile-hidden={mobileTab !== "characters"}>
          <h2 class="section-title">Characters</h2>

          {#if !identifiedName}
            <p class="rsvp-to-vote">Please RSVP before voting on a character</p>
          {:else if myAssignment}
            <div class="assigned-notice">
              <span class="assigned-icon">⚡</span>
              <div>
                <strong>You've been assigned a character!</strong>
                <p>You're playing <strong>{myAssignedCharacterName()}</strong>. No need to vote.</p>
              </div>
            </div>
          {:else}
            <p class="party-muted">
              Read the characters below, then vote for up to <strong>3</strong> you'd like to play — rank them in order of preference.
            </p>
          {/if}

          {#if characters.length > 0}
            <div class="character-grid">
              {#each characters as char}
                {@const isAssigned = assignedCharacterIds.has(char._id as string)}
                {@const assigneeName = assignedCharacterMap.get(char._id as string)}
                {@const rank = !isAssigned ? rankLabel(char._id) : null}
                {@const tally = firstChoiceTally().get(char._id as string) ?? 0}
                {@const isClickable = !isAssigned && !wantsDetective && !myAssignment && identifiedName && (rank !== null || rankings.length < 3)}
                <div
                  class="party-card character-card {rank !== null ? 'selected' : ''} {isAssigned ? 'assigned' : ''}"
                  onclick={() => isClickable && toggleRanking(char._id)}
                  role="button"
                  tabindex={isClickable ? 0 : -1}
                  onmousedown={(e) => { if (!isClickable) e.preventDefault(); }}
                  onkeydown={(e) => e.key === "Enter" && isClickable && toggleRanking(char._id)}
                  style="cursor: {isClickable ? 'pointer' : 'default'}"
                >
                  {#if rank !== null}
                    <div class="vote-option-rank">#{rank}</div>
                  {/if}
                  {#if isAssigned}
                    <div class="char-assigned-badge">Taken</div>
                  {/if}
                  <h3 class="character-name">{char.name}</h3>
                  <p class="character-desc">{char.description}</p>
                  {#if isAssigned && assigneeName}
                    <p class="char-assignee">Playing as: <strong>{assigneeName}</strong></p>
                  {/if}
                  {#if !isAssigned && !party.blindVoting && tally > 0}
                    <div class="tally">{tally} first-choice vote{tally === 1 ? "" : "s"}</div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          {#if !myAssignment}
            {#if identifiedName}
              <div class="vote-actions">
                <label class="detective-toggle">
                  <input
                    type="checkbox"
                    bind:checked={wantsDetective}
                    onchange={() => { if (wantsDetective) rankings = []; voteDone = false; }}
                  />
                  I'd prefer to be a detective (non-acting role)
                </label>

                {#if !wantsDetective}
                  <p class="vote-hint">
                    {#if rankings.length === 0}
                      Click characters above to rank your top 3 choices
                    {:else}
                      Selected: {rankings.map((id) => characters.find((c) => c._id === id)?.name).join(" → ")}
                    {/if}
                  </p>
                {/if}

                <button
                  class="party-btn party-btn-primary"
                  onclick={submitVote}
                  disabled={voteSaving || (!wantsDetective && rankings.length === 0)}
                >
                  {voteSaving ? "Saving…" : voteDone ? "Update Vote" : "Submit Vote"}
                </button>

                {#if voteDone}
                  <p class="success-note">✓ Vote saved!</p>
                {/if}
              </div>
            {/if}
          {/if}

          {#if !party.blindVoting && detectiveCount > 0}
            <p class="detective-tally">🕵️ {detectiveCount} guest{detectiveCount === 1 ? "" : "s"} want to be the detective</p>
          {/if}
        </section>
      {/if}

    </main>

    <nav class="mobile-nav">
      <button class="mobile-nav-tab" class:active={mobileTab === "details"} onclick={() => (mobileTab = "details")}>Details</button>
      <button class="mobile-nav-tab" class:active={mobileTab === "people"} onclick={() => (mobileTab = "people")}>People</button>
      <button class="mobile-nav-tab" class:active={mobileTab === "rsvp"} onclick={() => (mobileTab = "rsvp")}>RSVP</button>
      <button class="mobile-nav-tab" class:active={mobileTab === "characters"} onclick={() => (mobileTab = "characters")}>Characters</button>
    </nav>

    <!-- Footer decoration (Claude-generated) -->
    {#if party.theme?.footerHtml}
      <div class="party-footer-deco">
        {@html party.theme.footerHtml}
      </div>
    {/if}

  </div>
{/if}

<style>
  /* Default theme — overridden by Claude-generated CSS injected into <head> */
  :root {
    --color-bg: #080810;
    --color-surface: #12121c;
    --color-primary: #8b6cf6;
    --color-accent: #c4a84a;
    --color-text: #e8e4f0;
    --color-muted: #6b6680;
    --color-border: #22222e;
    --font-heading: Georgia, serif;
    --font-body: system-ui, sans-serif;
  }

  :global(body) {
    margin: 0;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body);
  }

  .loading, .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    color: var(--color-muted);
  }

  .party-page {
    min-height: 100vh;
  }

  /* Header/footer decoration containers */
  .party-header-deco,
  .party-footer-deco {
    width: 100%;
    overflow: hidden;
    line-height: 0;
  }

  /* Hero */
  .party-hero {
    text-align: center;
    padding: 4rem 2rem 3rem;
    background: linear-gradient(to bottom, var(--color-surface), var(--color-bg));
  }

  .party-title {
    font-family: var(--font-heading);
    font-size: clamp(2rem, 6vw, 4rem);
    margin: 0 0 0.5rem;
    color: var(--color-accent);
    text-shadow: 0 2px 20px rgba(0,0,0,0.5);
    line-height: 1.1;
  }

  .party-subtitle {
    font-size: 1.15rem;
    color: var(--color-muted);
    margin: 0;
    letter-spacing: 0.05em;
  }

  /* Main content */
  .party-main {
    max-width: 860px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .party-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 2rem;
  }

  .section-title {
    font-family: var(--font-heading);
    font-size: 1.4rem;
    margin: 0 0 1.25rem;
    color: var(--color-accent);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.75rem;
  }

  .party-muted {
    color: var(--color-muted);
    font-size: 0.95rem;
    margin: 0 0 1rem;
  }

  /* Details grid */
  .details-grid {
    display: grid;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    gap: 1rem;
    align-items: baseline;
  }

  .detail-row.full { flex-direction: column; gap: 0.25rem; }

  .detail-label {
    min-width: 110px;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  /* Guests */
  .guest-groups { display: flex; flex-direction: column; gap: 1.25rem; }

  .guest-group-label {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .guest-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }

  .guest-chip {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
  }

  .guest-chip.yes { background: #1e3a2a; color: #7ee0a0; }
  .guest-chip.no { background: #3a1e1e; color: #e08080; }
  .guest-chip.pending { background: #2a2820; color: #d4c86a; }

  /* RSVP form */
  .identify-form, .rsvp-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .rsvp-greeting { margin: 0; font-size: 1rem; }

  .btn-link {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: inherit;
    padding: 0;
    text-decoration: underline;
  }

  .rsvp-options {
    display: flex;
    gap: 0.75rem;
  }

  .rsvp-btn {
    flex: 1;
    padding: 0.85rem;
    border-radius: 8px;
    border: 2px solid var(--color-border);
    background: transparent;
    color: var(--color-muted);
    font-size: 1rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  .rsvp-btn.active {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-text);
  }

  .rsvp-btn.active.no {
    border-color: #e05050;
    background: rgba(224, 80, 80, 0.12);
  }

  .form-group { display: flex; flex-direction: column; gap: 0.4rem; }

  .party-label {
    font-size: 0.8rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .party-input {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 7px;
    padding: 0.65rem 0.9rem;
    color: var(--color-text);
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }

  .party-input:focus { outline: none; border-color: var(--color-primary); }

  .party-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    font-size: 1rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    align-self: flex-start;
  }

  .party-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .party-btn-primary {
    background: var(--color-primary);
    color: #fff;
  }

  .party-btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .success-note {
    color: #6ee7a0;
    font-size: 0.9rem;
    margin: 0;
  }

  /* Manual assignment notice */
  .assigned-notice {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
  }

  .assigned-icon { font-size: 1.4rem; flex-shrink: 0; }
  .assigned-notice p { margin: 0.25rem 0 0; color: var(--color-muted); font-size: 0.95rem; }

  /* Character grid */
  .character-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .party-card {
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: 10px;
    padding: 1.25rem;
    position: relative;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .party-card:focus { outline: 2px solid var(--color-primary); }

  .party-card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 16px color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  .vote-option-rank {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: var(--color-primary);
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 800;
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
  }

  .party-card.assigned {
    opacity: 0.55;
    border-color: var(--color-border);
  }

  .char-assigned-badge {
    display: inline-block;
    background: var(--color-border);
    color: var(--color-muted);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    margin-bottom: 0.5rem;
  }

  .char-assignee {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--color-muted);
  }

  .character-name {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    margin: 0 0 0.6rem;
    color: var(--color-accent);
  }

  .character-desc {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.5;
  }

  .tally {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: var(--color-primary);
    opacity: 0.8;
  }

  /* Vote controls */
  .vote-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detective-toggle {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .vote-hint {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin: 0;
  }

  .rsvp-to-vote {
    font-size: 0.875rem;
    color: #e07070;
    background: rgba(224, 80, 80, 0.08);
    border: 1px solid rgba(224, 80, 80, 0.25);
    border-radius: 7px;
    padding: 0.6rem 0.9rem;
    margin: 0 0 1.25rem;
  }

  .detective-tally {
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--color-muted);
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .mobile-nav { display: none; }

  @media (max-width: 600px) {
    .party-main { padding: 1.5rem 1rem 5rem; }
    .party-section { padding: 1.25rem; }
    .rsvp-options { flex-direction: column; }
    .character-grid { grid-template-columns: 1fr; }

    .mobile-hidden { display: none !important; }

    .mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      z-index: 100;
    }

    .mobile-nav-tab {
      flex: 1;
      padding: 0.75rem 0.25rem 0.85rem;
      background: transparent;
      border: none;
      color: var(--color-muted);
      font-size: 0.72rem;
      font-family: inherit;
      cursor: pointer;
      transition: color 0.15s;
      letter-spacing: 0.02em;
    }

    .mobile-nav-tab.active {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
</style>
