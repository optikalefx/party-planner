<script lang="ts">
  import parchment from '$lib/assets/parchment.jpg';
  import inputTexture from '$lib/assets/input-texture.jpg';
  import { useQuery, useConvexClient } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";
  import { runRCV } from "$lib/rcv";
  import { goto } from "$app/navigation";
  import { auth, signOut } from "$lib/auth.svelte";
  const userQuery = useQuery(api.users.getCurrent, {});

  $effect(() => {
    if (!auth.isLoading && !auth.token) {
      goto("/", { replaceState: true });
    }
  });

  const client = useConvexClient();

  // ── State ────────────────────────────────────────────────────────────────────
  let selectedPartyId = $state<Id<"parties"> | null>(null);
  let view = $state<"parties" | "detail">("parties");
  let activeTab = $state<"details" | "characters" | "theme" | "guests" | "voting">("details");
  let saving = $state(false);
  let status = $state("");

  // Party form
  let form = $state({
    name: "", partyType: "", date: "", time: "", location: "",
    food: "", drinks: "", dress: "", notes: "",
  });

  // Character editing
  let editingCharId = $state<Id<"characters"> | null>(null);
  let charForm = $state({ name: "", description: "" });

  // Character import (paste text or upload image of character list)
  let charImportText = $state("");
  let charImportImageFile = $state<File | null>(null);
  let parsingCharacters = $state(false);

  // Theme
  let themePrompt = $state("");
  let themePhotoFile = $state<File | null>(null);
  let useInvitePhoto = $state(false);
  let generatingTheme = $state(false);

  // Invite upload
  let inviteFile = $state<File | null>(null);
  let parsingInvite = $state(false);

  // Guest form
  let guestForm = $state({ name: "", rsvpStatus: "yes" as "yes" | "no" | "pending", plusOne: "" });

  // RCV results
  let rcvResults = $state<{ guestName: string; characterId: string }[] | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const partiesQuery = useQuery(api.parties.list, {});

  const partyQuery = useQuery(
    api.parties.getByInviteCode,
    () => {
      if (!selectedPartyId) return "skip";
      const party = partiesQuery.data?.find((p) => p._id === selectedPartyId);
      return party ? { inviteCode: party.inviteCode } : "skip";
    }
  );

  const guestsQuery = useQuery(
    api.guests.listByParty,
    () => (selectedPartyId ? { partyId: selectedPartyId } : "skip")
  );

  const charactersQuery = useQuery(
    api.characters.listByParty,
    () => (selectedPartyId ? { partyId: selectedPartyId } : "skip")
  );

  const votesQuery = useQuery(
    api.votes.listByParty,
    () => (selectedPartyId ? { partyId: selectedPartyId } : "skip")
  );

  // ── Derived ──────────────────────────────────────────────────────────────────
  const party = $derived(partyQuery.data);
  const guests = $derived(guestsQuery.data ?? []);
  const characters = $derived(charactersQuery.data ?? []);
  const votes = $derived(votesQuery.data ?? []);

  const rsvpYes = $derived(guests.filter((g) => g.rsvpStatus === "yes"));
  const rsvpNo = $derived(guests.filter((g) => g.rsvpStatus === "no"));

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function flash(msg: string) {
    status = msg;
    setTimeout(() => (status = ""), 3000);
  }

  function selectParty(id: Id<"parties">) {
    selectedPartyId = id;
    const p = partiesQuery.data?.find((x) => x._id === id);
    if (p) {
      form = {
        name: p.name ?? "",
        partyType: p.partyType ?? "",
        date: p.date ?? "",
        time: p.time ?? "",
        location: p.location ?? "",
        food: p.food ?? "",
        drinks: p.drinks ?? "",
        dress: p.dress ?? "",
        notes: p.notes ?? "",
      };
      themePrompt = p.theme?.prompt ?? "";
    }
    rcvResults = null;
    activeTab = "details";
    view = "detail";
  }

  async function uploadFile(file: File): Promise<string> {
    const uploadUrl = await client.mutation(api.storage.generateUploadUrl, {});
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await res.json();
    return storageId;
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function createParty() {
    saving = true;
    try {
      const id = await client.mutation(api.parties.create, { name: "New Party" }) as Id<"parties">;
      await partiesQuery;
      selectParty(id);
    } finally {
      saving = false;
    }
  }

  async function saveParty() {
    if (!selectedPartyId) return;
    saving = true;
    try {
      await client.mutation(api.parties.update, { id: selectedPartyId, ...form });
      flash("Saved!");
    } finally {
      saving = false;
    }
  }

  async function toggleBlindVoting() {
    if (!selectedPartyId || !party) return;
    await client.mutation(api.parties.update, {
      id: selectedPartyId,
      blindVoting: !party.blindVoting,
    });
  }

  async function handleInviteUpload() {
    if (!inviteFile) return;
    parsingInvite = true;
    try {
      const storageId = await uploadFile(inviteFile);
      const details = await client.action(api.parseInvite.parseInvite, { storageId }) as any;
      form = {
        name: details.name ?? form.name,
        partyType: details.partyType ?? form.partyType,
        date: details.date ?? form.date,
        time: details.time ?? form.time,
        location: details.location ?? form.location,
        food: details.food ?? form.food,
        drinks: details.drinks ?? form.drinks,
        dress: details.dress ?? form.dress,
        notes: details.notes ?? form.notes,
      };
      if (selectedPartyId) {
        await client.mutation(api.parties.update, { id: selectedPartyId, inviteStorageId: storageId, ...form });
      }
      inviteFile = null;
      flash("Invite parsed and saved!");
    } catch (e) {
      flash("Error parsing invite: " + (e as Error).message);
    } finally {
      parsingInvite = false;
    }
  }

  async function generateTheme() {
    if (!selectedPartyId || !party) return;
    generatingTheme = true;
    try {
      let photoStorageId: string | undefined;
      if (useInvitePhoto && party.inviteStorageId) {
        photoStorageId = party.inviteStorageId;
      } else if (themePhotoFile) {
        photoStorageId = await uploadFile(themePhotoFile);
      }

      const result = await client.action(api.generateTheme.generateTheme, {
        partyName: party.name,
        partyType: party.partyType,
        prompt: themePrompt,
        photoStorageId,
      }) as any;

      await client.mutation(api.parties.updateTheme, {
        id: selectedPartyId,
        theme: {
          prompt: themePrompt,
          photoStorageId,
          css: result.css,
          headerHtml: result.headerHtml,
          footerHtml: result.footerHtml,
        },
      });
      flash("Theme generated!");
    } catch (e) {
      flash("Error generating theme: " + (e as Error).message);
    } finally {
      generatingTheme = false;
    }
  }

  async function addCharacter() {
    if (!selectedPartyId || !charForm.name.trim()) return;
    await client.mutation(api.characters.create, {
      partyId: selectedPartyId,
      name: charForm.name.trim(),
      description: charForm.description.trim(),
      order: characters.length,
    });
    charForm = { name: "", description: "" };
  }

  async function saveCharacter(id: Id<"characters">) {
    await client.mutation(api.characters.update, { id, ...charForm });
    editingCharId = null;
    charForm = { name: "", description: "" };
  }

  async function importCharacters() {
    if (!selectedPartyId || (!charImportText.trim() && !charImportImageFile)) return;
    parsingCharacters = true;
    try {
      let storageId: string | undefined;
      if (charImportImageFile) {
        storageId = await uploadFile(charImportImageFile);
      }
      const parsed = await client.action(api.parseCharacters.parseCharacters, {
        text: charImportText,
        storageId: storageId as any,
      }) as { name: string; description: string }[];
      let order = characters.length;
      for (const char of parsed) {
        await client.mutation(api.characters.create, {
          partyId: selectedPartyId,
          name: char.name,
          description: char.description,
          order: order++,
        });
      }
      charImportText = "";
      charImportImageFile = null;
      flash(`Imported ${parsed.length} characters!`);
    } catch (e) {
      flash("Error parsing characters: " + (e as Error).message);
    } finally {
      parsingCharacters = false;
    }
  }

  async function deleteCharacter(id: Id<"characters">) {
    if (!confirm("Delete this character?")) return;
    await client.mutation(api.characters.remove, { id });
  }

  function startEditChar(char: { _id: Id<"characters">; name: string; description: string }) {
    editingCharId = char._id;
    charForm = { name: char.name, description: char.description };
  }

  async function addGuest() {
    if (!selectedPartyId || !guestForm.name.trim()) return;
    await client.mutation(api.guests.upsertRsvp, {
      partyId: selectedPartyId,
      name: guestForm.name.trim(),
      rsvpStatus: guestForm.rsvpStatus,
      plusOne: guestForm.plusOne.trim() || undefined,
    });
    guestForm = { name: "", rsvpStatus: "yes", plusOne: "" };
  }

  async function removeGuest(id: Id<"guests">) {
    await client.mutation(api.guests.remove, { id });
  }

  async function assignGuest(id: Id<"guests">, assignedCharacterId: string | undefined) {
    await client.mutation(api.guests.assignGuest, { id, assignedCharacterId });
  }

  function computeRCV() {
    if (!characters.length || !votes.length) return;

    const manualGuests = guests.filter((g) => g.assignedCharacterId);
    const manualResults = manualGuests.map((g) => ({
      guestName: g.name,
      characterId: g.assignedCharacterId!,
    }));
    const takenByManual = new Set(
      manualGuests.map((g) => g.assignedCharacterId!).filter((id) => id !== "detective")
    );
    const manualNames = new Set(manualGuests.map((g) => g.name.toLowerCase()));

    const filteredVotes = votes.filter((v) => !manualNames.has(v.guestName.toLowerCase()));
    const availableCharIds = characters.map((c) => c._id as string).filter((id) => !takenByManual.has(id));

    const { assignments } = runRCV(
      filteredVotes.map((v) => ({
        guestName: v.guestName,
        rankings: v.rankings as string[],
        wantsDetective: v.wantsDetective,
      })),
      availableCharIds
    );
    rcvResults = [...manualResults, ...assignments];
  }

  function charNameById(id: string) {
    if (id === "detective") return "🕵️ Detective";
    if (id === "unassigned") return "⚠️ Unassigned";
    return characters.find((c) => c._id === id)?.name ?? id;
  }

  const partyUrl = $derived(
    party ? `${typeof window !== "undefined" ? window.location.origin : ""}/party/${party.inviteCode}` : ""
  );
</script>

<!-- Fixed page border frame -->
<div class="page-frame"></div>

<div class="admin" style:--parchment="url({parchment})" style:--input-texture="url({inputTexture})">
  <header class="admin-header">
    <h1>🎭 Party Planner Admin</h1>
    <div class="header-actions">
      {#if view === "detail"}
        <button class="btn btn-ghost" onclick={() => (view = "parties")}>← All Parties</button>
      {/if}
      {#if userQuery.data?.image}
        <img src={userQuery.data.image} alt="profile" class="avatar" />
      {/if}
      <button class="btn btn-ghost btn-signout" onclick={() => signOut(client)}>Sign out</button>
    </div>
  </header>

  {#if status}
    <div class="flash">{status}</div>
  {/if}

  <!-- ── Party List ─────────────────────────────────────────────────────────── -->
  {#if view === "parties"}
    <div class="section">
      <div class="section-header">
        <h2>Parties</h2>
        <button class="btn btn-primary" onclick={createParty} disabled={saving}>
          + New Party
        </button>
      </div>

      {#if partiesQuery.isLoading}
        <p class="muted">Loading...</p>
      {:else if !partiesQuery.data?.length}
        <p class="muted">No parties yet. Create one to get started.</p>
      {:else}
        <div class="party-list">
          {#each partiesQuery.data as p}
            <button class="party-card" onclick={() => selectParty(p._id)}>
              <strong>{p.name}</strong>
              <span class="invite-code">{p.inviteCode}</span>
              {#if p.date}<span class="muted">{p.date}{p.time ? ` @ ${p.time}` : ""}</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── Party Detail ───────────────────────────────────────────────────────── -->
  {#if view === "detail" && selectedPartyId}
    <div class="detail-layout">

      <!-- Tab bar -->
      <nav class="tab-bar">
        <button
          class="tab-btn"
          class:active={activeTab === "details"}
          onclick={() => (activeTab = "details")}
        >Details</button>
        <button
          class="tab-btn"
          class:active={activeTab === "characters"}
          onclick={() => (activeTab = "characters")}
        >Characters {characters.length > 0 ? `(${characters.length})` : ""}</button>
        <button
          class="tab-btn"
          class:active={activeTab === "theme"}
          onclick={() => (activeTab = "theme")}
        >Theme {party?.theme?.css ? "✓" : ""}</button>
        <button
          class="tab-btn"
          class:active={activeTab === "guests"}
          onclick={() => (activeTab = "guests")}
        >Guests {guests.length > 0 ? `(${guests.length})` : ""}</button>
        <button
          class="tab-btn"
          class:active={activeTab === "voting"}
          onclick={() => (activeTab = "voting")}
        >Voting {votes.length > 0 ? `(${votes.length})` : ""}</button>
      </nav>

      <!-- ── Tab: Details ──────────────────────────────────────────────────── -->
      {#if activeTab === "details"}
        <div class="tab-panel">

          <!-- Invite upload -->
          <div class="form-section">
            <h3 class="form-section-title">Import from Invite</h3>
            <div class="field">
              <label>Upload invite (PDF or image)</label>
              <div class="input-row">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onchange={(e) => (inviteFile = (e.target as HTMLInputElement).files?.[0] ?? null)}
                />
                <button
                  class="btn btn-secondary"
                  onclick={handleInviteUpload}
                  disabled={!inviteFile || parsingInvite}
                >
                  {parsingInvite ? "Parsing…" : "Parse with Claude"}
                </button>
              </div>
            </div>
          </div>

          <!-- Party details form -->
          <div class="form-section">
            <h3 class="form-section-title">Party Details</h3>
            <div class="form-grid">
              <div class="field">
                <label>Party Name</label>
                <input bind:value={form.name} type="text" placeholder="Sarah's Murder Mystery" />
              </div>
              <div class="field">
                <label>Party Type</label>
                <input bind:value={form.partyType} type="text" placeholder="Murder mystery, birthday, halloween…" />
              </div>
              <div class="field">
                <label>Date</label>
                <input bind:value={form.date} type="text" placeholder="Saturday April 18th" />
              </div>
              <div class="field">
                <label>Time</label>
                <input bind:value={form.time} type="text" placeholder="8pm" />
              </div>
              <div class="field">
                <label>Location</label>
                <input bind:value={form.location} type="text" placeholder="123 Main St" />
              </div>
              <div class="field">
                <label>Food</label>
                <input bind:value={form.food} type="text" placeholder="Appetizers" />
              </div>
              <div class="field">
                <label>Drinks</label>
                <input bind:value={form.drinks} type="text" placeholder="Definitely" />
              </div>
              <div class="field full">
                <label>Dress Code</label>
                <input bind:value={form.dress} type="text" placeholder="Space, stars, or black" />
              </div>
              <div class="field full">
                <label>Notes</label>
                <textarea bind:value={form.notes} rows="3" placeholder="Additional notes..."></textarea>
              </div>
            </div>
          </div>

          <div class="tab-actions">
            <button class="btn btn-primary" onclick={saveParty} disabled={saving}>
              {saving ? "Saving…" : "Save Party"}
            </button>
            {#if party}
              <div class="invite-link">
                <span class="muted">Party link:</span>
                <a href={partyUrl} target="_blank">{partyUrl}</a>
                <button
                  class="btn btn-ghost"
                  onclick={() => navigator.clipboard.writeText(partyUrl)}
                >Copy</button>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- ── Tab: Characters ───────────────────────────────────────────────── -->
      {#if activeTab === "characters"}
        <div class="tab-panel">

          <!-- Import -->
          <div class="form-section">
            <h3 class="form-section-title">Import with Claude</h3>
            <p class="form-hint">Paste a character list or upload a photo — Claude will extract all names and descriptions.</p>
            <div class="field">
              <label>Character list text</label>
              <textarea
                bind:value={charImportText}
                rows="5"
                placeholder="Paste character list here…"
                disabled={parsingCharacters}
              ></textarea>
            </div>
            <div class="field">
              <label>Or upload an image</label>
              <div class="input-row">
                <input
                  type="file"
                  accept="image/*"
                  onchange={(e) => (charImportImageFile = (e.target as HTMLInputElement).files?.[0] ?? null)}
                  disabled={parsingCharacters}
                />
                <button
                  class="btn btn-secondary"
                  onclick={importCharacters}
                  disabled={(!charImportText.trim() && !charImportImageFile) || parsingCharacters}
                >
                  {parsingCharacters ? "Parsing…" : "Parse with Claude"}
                </button>
              </div>
            </div>
          </div>

          <!-- Character list -->
          {#if characters.length > 0}
            <div class="form-section">
              <h3 class="form-section-title">Characters ({characters.length})</h3>
              <div class="char-list">
                {#each characters as char}
                  {#if editingCharId === char._id}
                    <div class="char-edit">
                      <div class="field">
                        <label>Name</label>
                        <input bind:value={charForm.name} type="text" placeholder="Character name" />
                      </div>
                      <div class="field">
                        <label>Description</label>
                        <textarea bind:value={charForm.description} rows="3" placeholder="Description"></textarea>
                      </div>
                      <div class="btn-row">
                        <button class="btn btn-primary" onclick={() => saveCharacter(char._id)}>Save</button>
                        <button class="btn btn-ghost" onclick={() => (editingCharId = null)}>Cancel</button>
                      </div>
                    </div>
                  {:else}
                    <div class="char-row">
                      <div class="char-info">
                        <strong>{char.name}</strong>
                        <p class="muted char-desc">{char.description}</p>
                      </div>
                      <div class="char-actions">
                        <button class="btn btn-ghost" onclick={() => startEditChar(char)}>Edit</button>
                        <button class="btn btn-danger" onclick={() => deleteCharacter(char._id)}>✕</button>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          <!-- Add character -->
          <div class="form-section">
            <h3 class="form-section-title">Add Character</h3>
            <div class="field">
              <label>Name</label>
              <input bind:value={charForm.name} type="text" placeholder="Character name" disabled={editingCharId !== null} />
            </div>
            <div class="field">
              <label>Description</label>
              <textarea bind:value={charForm.description} rows="3" placeholder="Character description" disabled={editingCharId !== null}></textarea>
            </div>
            <div class="tab-actions">
              <button class="btn btn-primary" onclick={addCharacter} disabled={!charForm.name.trim() || editingCharId !== null}>
                Add Character
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- ── Tab: Theme ────────────────────────────────────────────────────── -->
      {#if activeTab === "theme"}
        <div class="tab-panel">
          <div class="form-section">
            <h3 class="form-section-title">Generate Theme</h3>
            <div class="field">
              <label>Theme Prompt</label>
              <textarea
                bind:value={themePrompt}
                rows="4"
                placeholder="Describe the visual theme. E.g. 'Art deco space noir, dark navy and gold, lunar landscape, 1920s glamour meets sci-fi murder mystery...'"
              ></textarea>
            </div>
            <div class="field">
              <label>Reference Photo (optional)</label>
              {#if party?.inviteStorageId && !useInvitePhoto}
                <div class="input-row">
                  <input
                    type="file"
                    accept="image/*"
                    onchange={(e) => (themePhotoFile = (e.target as HTMLInputElement).files?.[0] ?? null)}
                  />
                  <button class="btn btn-secondary" onclick={() => { useInvitePhoto = true; themePhotoFile = null; }}>
                    Use uploaded invite
                  </button>
                </div>
              {:else if useInvitePhoto}
                <div class="input-row">
                  <span class="invite-photo-badge">✓ Using uploaded invite</span>
                  <button class="btn btn-ghost" onclick={() => (useInvitePhoto = false)}>Change</button>
                </div>
              {:else}
                <input
                  type="file"
                  accept="image/*"
                  onchange={(e) => (themePhotoFile = (e.target as HTMLInputElement).files?.[0] ?? null)}
                />
              {/if}
            </div>
            <div class="tab-actions">
              <button
                class="btn btn-primary"
                onclick={generateTheme}
                disabled={(!themePrompt.trim() && !useInvitePhoto && !themePhotoFile) || generatingTheme}
              >
                {generatingTheme ? "Generating… (this takes ~30s)" : "Generate Theme with Claude"}
              </button>
            </div>
            {#if party?.theme?.css}
              <p class="success">✓ Theme applied. <a href={partyUrl} target="_blank">Preview party page →</a></p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- ── Tab: Guests ───────────────────────────────────────────────────── -->
      {#if activeTab === "guests"}
        <div class="tab-panel">

          <!-- Settings -->
          <div class="form-section">
            <h3 class="form-section-title">Settings</h3>
            {#if party}
              <label class="toggle-label">
                <input type="checkbox" checked={party.blindVoting} onchange={toggleBlindVoting} />
                Blind voting (guests can't see standings)
              </label>
            {/if}
          </div>

          <!-- Guest list -->
          <div class="form-section">
            <h3 class="form-section-title">Guest List</h3>
            {#if !guests.length}
              <p class="muted">No RSVPs yet.</p>
            {:else}
              <div class="guest-summary">
                <span class="badge yes">✓ {rsvpYes.length} yes</span>
                <span class="badge no">✗ {rsvpNo.length} no</span>
                <span class="badge pending">? {guests.length - rsvpYes.length - rsvpNo.length} pending</span>
              </div>
              <table class="guest-table">
                <colgroup>
                  <col class="col-name" />
                  <col class="col-rsvp" />
                  <col class="col-char" />
                  <col class="col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>RSVP</th>
                    <th>Character</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {#each guests as guest}
                    <tr>
                      <td class="guest-name-cell">
                        {guest.name}
                        {#if guest.plusOne}<span class="plus-one">+{guest.plusOne}</span>{/if}
                      </td>
                      <td><span class="badge {guest.rsvpStatus}">{guest.rsvpStatus}</span></td>
                      <td>
                        <select
                          class="assign-select"
                          value={guest.assignedCharacterId ?? ""}
                          onchange={(e) => {
                            const val = (e.target as HTMLSelectElement).value;
                            assignGuest(guest._id, val || undefined);
                          }}
                        >
                          <option value="">— none —</option>
                          <option value="detective">🕵️ Detective</option>
                          {#each characters as char}
                            <option value={char._id}>{char.name}</option>
                          {/each}
                        </select>
                      </td>
                      <td class="action-cell">
                        <button class="btn btn-danger tiny" onclick={() => removeGuest(guest._id)}>🗑</button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

          <!-- Add guest -->
          <div class="form-section">
            <h3 class="form-section-title">Add Guest</h3>
            <div class="form-grid">
              <div class="field">
                <label>Name</label>
                <input bind:value={guestForm.name} type="text" placeholder="e.g. Sarah Johnson" />
              </div>
              <div class="field">
                <label>RSVP Status</label>
                <select bind:value={guestForm.rsvpStatus}>
                  <option value="yes">Yes — attending</option>
                  <option value="no">No — not attending</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div class="field full">
                <label>Plus One (optional)</label>
                <input bind:value={guestForm.plusOne} type="text" placeholder="e.g. John Smith" />
              </div>
            </div>
            <div class="tab-actions">
              <button class="btn btn-primary" onclick={addGuest} disabled={!guestForm.name.trim()}>
                Add Guest
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- ── Tab: Voting ───────────────────────────────────────────────────── -->
      {#if activeTab === "voting"}
        <div class="tab-panel">
          <div class="form-section">
            <h3 class="form-section-title">Character Voting</h3>
            <p class="muted">{votes.length} vote{votes.length === 1 ? "" : "s"} submitted</p>

            {#if votes.length > 0}
              <div class="vote-summary">
                {#each votes as vote}
                  <div class="vote-row">
                    <strong>{vote.guestName}</strong>
                    {#if vote.wantsDetective}
                      <span class="muted">→ Detective</span>
                    {:else}
                      <span class="muted">
                        → {vote.rankings.slice(0, 3).map((id) => charNameById(id as string)).join(", ")}
                      </span>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="tab-actions">
                <button class="btn btn-primary" onclick={computeRCV}>
                  Run Character Assignment (RCV)
                </button>
              </div>

              {#if rcvResults}
                <div class="rcv-results">
                  <h3>Assignments</h3>
                  {#each rcvResults as result}
                    <div class="rcv-row">
                      <span>{result.guestName}</span>
                      <span class="arrow">→</span>
                      <strong>{charNameById(result.characterId)}</strong>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else}
              <p class="muted">No votes yet. Guests can vote from the party page.</p>
            {/if}
          </div>
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Rye&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

  :global(body) {
    margin: 0;
    font-family: 'Lora', 'Georgia', serif;
    background-color: #42b8cc;
    background-image:
      linear-gradient(rgba(255,255,255,0.13) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.13) 1px, transparent 1px);
    background-size: 44px 44px;
    min-height: 100vh;
  }

  /* Page border frame — same as homepage */
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

  .admin {
    max-width: 900px;
    margin: 0 auto;
    padding: 80px 1.5rem 80px;
    color: #2a1808;
  }

  /* ── Header ── */
  .admin-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem 1.25rem;
    background: #0d2035;
    border: 4px solid #0d2035;
    box-shadow: inset 0 0 0 2px #cc4150;
    color: #f0e3b2;
  }

  .admin-header h1 {
    margin: 0;
    font-size: 1.3rem;
    flex: 1;
    color: #f0e3b2;
    letter-spacing: 0.04em;
    font-family: 'Rye', 'Georgia', serif;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn-signout {
    opacity: 0.65;
    font-size: 0.85rem;
  }
  .btn-signout:hover { opacity: 1; }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #cc4150;
  }

  .flash {
    background: #d4f0d8;
    border: 1px solid #60a870;
    color: #1a5030;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1.25rem;
    font-weight: 500;
  }

  /* ── Shared parchment panel ── */
  .parchment-panel {
    background-image: var(--parchment);
    background-size: cover;
    background-position: center;
  }

  /* ── Party list section ── */
  .section {
    background-image: linear-gradient(rgba(240,220,160,0.55), rgba(240,220,160,0.55)), var(--parchment);
    background-size: cover;
    border: 4px solid #0d2035;
    box-shadow: inset 0 0 0 2px #cc4150;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
    color: #2a1808;
  }

  .section h2 {
    margin: 0 0 1.25rem;
    font-size: 0.85rem;
    color: #7a4020;
    letter-spacing: 0.04em;
    font-family: 'Rye', 'Georgia', serif;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .section-header h2 { margin: 0; }

  .party-list { display: flex; flex-direction: column; gap: 0.6rem; }

  .party-card {
    background: rgba(255,255,255,0.55);
    border: 1px solid #c8a060;
    border-radius: 4px;
    padding: 0.9rem 1.1rem;
    cursor: pointer;
    text-align: left;
    color: #2a1808;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: background 0.15s, border-color 0.15s;
    font-family: inherit;
  }
  .party-card:hover { background: rgba(255,255,255,0.8); border-color: #cc4150; }
  .party-card strong { flex: 1; color: #160a02; }

  .invite-code {
    font-family: monospace;
    background: rgba(0,0,0,0.08);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.82rem;
    color: #5a3010;
    letter-spacing: 0.1em;
    border: 1px solid #c8a060;
  }

  /* ── Detail layout (tabs) ── */
  .detail-layout {
    background-image: linear-gradient(rgba(240,220,160,0.55), rgba(240,220,160,0.55)), var(--parchment);
    background-size: cover;
    border: 4px solid #0d2035;
    box-shadow: inset 0 0 0 2px #cc4150;
    overflow: hidden;
    color: #2a1808;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid #c8a060;
    overflow-x: auto;
    scrollbar-width: none;
    background: #0d2035;
  }
  .tab-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
    padding: 0.8rem 1.2rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: #8ab0c8;
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn:hover { color: #f0e3b2; }
  .tab-btn.active {
    color: #f0e3b2;
    border-bottom-color: #cc4150;
  }

  .tab-panel {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  /* ── Form sections ── */
  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-section-title {
    margin: 0;
    font-size: 0.82rem;
    color: #7a4020;
    letter-spacing: 0.03em;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid #c8a060;
    font-family: 'Rye', 'Georgia', serif;
  }

  .form-hint {
    margin: 0;
    font-size: 0.83rem;
    color: #7a5030;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 560px) {
    .form-grid { grid-template-columns: 1fr; }
    .field.full { grid-column: 1; }
  }

  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field.full { grid-column: 1 / -1; }

  label {
    font-size: 0.75rem;
    color: #7a4020;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  input[type="text"],
  textarea,
  select {
    background-image: var(--input-texture);
    background-size: 220px 220px;
    background-color: #f5edcf;
    border: 2px solid #3a2a10;
    box-shadow:
      inset 0 0 0 2px #e8dcc0,
      2px 3px 0 #3a2a10;
    border-radius: 0;
    padding: 0.6rem 0.75rem;
    color: #1a0e04;
    font-size: 0.95rem;
    font-family: 'Lora', 'Georgia', serif;
    transition: box-shadow 0.15s, border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  input[type="text"]:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: #26244a;
    box-shadow:
      inset 0 0 0 2px #e8dcc0,
      2px 3px 0 #26244a,
      0 0 0 3px rgba(204,65,80,0.35);
  }
  input[type="file"] {
    background: rgba(255,255,255,0.5);
    border: 2px dashed #8a6030;
    border-radius: 0;
    padding: 0.5rem 0.75rem;
    color: #2a1808;
    font-size: 0.9rem;
    font-family: 'Lora', 'Georgia', serif;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
  }
  textarea { resize: vertical; }

  .input-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .input-row input[type="file"] { flex: 1; min-width: 0; }

  .tab-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-top: 0.25rem;
  }

  .invite-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    flex-wrap: wrap;
    color: #5a3010;
  }
  .invite-link a { color: #cc4150; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    border-radius: 4px;
    border: none;
    font-size: 0.875rem;
    font-family: 'Lora', 'Georgia', serif;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
    text-decoration: none;
    white-space: nowrap;
    letter-spacing: 0.01em;
    font-weight: 600;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .btn-primary { background: #cc4150; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #a82030; }

  .btn-secondary { background: #1a3a52; color: #f0e3b2; }
  .btn-secondary:hover:not(:disabled) { background: #0d2035; }

  .btn-ghost { background: transparent; color: #5a3010; border: 1px solid #b89060; }
  .btn-ghost:hover:not(:disabled) { background: rgba(0,0,0,0.06); border-color: #8a6030; }

  /* ghost in dark areas (tab bar / header) */
  .admin-header .btn-ghost,
  .tab-bar ~ * .btn-ghost {
    color: #c8b890;
    border-color: #2e5878;
  }
  .admin-header .btn-ghost:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
    color: #f0e3b2;
  }

  .btn-danger { background: transparent; color: #c82020; border: 1px solid #e0a0a0; }
  .btn-danger:hover:not(:disabled) { background: #fde8e8; border-color: #c82020; }

  .btn.tiny { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
  .btn-row { display: flex; gap: 0.5rem; }

  /* ── Characters ── */
  .char-list { display: flex; flex-direction: column; gap: 0.6rem; }

  .char-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.85rem 1rem;
    background: rgba(255,255,255,0.5);
    border-radius: 4px;
    border: 1px solid #c8a060;
  }

  .char-info { flex: 1; }
  .char-desc { margin: 0.25rem 0 0; font-size: 0.85rem; color: #7a5030; }
  .char-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

  .char-edit {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255,255,255,0.5);
    border-radius: 4px;
    border: 1px solid #cc4150;
  }

  /* ── Misc ── */
  .muted { color: #7a5030; font-size: 0.9rem; }
  .success { color: #1a6030; font-size: 0.9rem; margin-top: 0.25rem; }
  .success a { color: #1a6030; }

  .badge {
    padding: 0.2rem 0.6rem;
    border-radius: 3px;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .badge.yes { background: #c8f0d8; color: #1a6030; }
  .badge.no { background: #f0c8c8; color: #8a1818; }
  .badge.pending { background: #f0e8c0; color: #7a5010; }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: #2a1808;
  }

  /* ── Guest table ── */
  .guest-summary { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .guest-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  .guest-table thead th {
    text-align: left;
    font-size: 0.7rem;
    color: #7a4020;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 0.5rem 0.5rem;
    font-weight: 700;
    border-bottom: 1px solid #c8a060;
  }
  .guest-table thead th:first-child { padding-left: 0; }
  .guest-table thead th:last-child { padding-right: 0; text-align: center; }

  .guest-table col.col-name { width: auto; }
  .guest-table col.col-rsvp { width: 52px; }
  .guest-table col.col-char { width: 45%; }
  .guest-table col.col-action { width: 32px; }

  .guest-table tbody td {
    padding: 0.55rem 0.5rem;
    vertical-align: middle;
    border-bottom: 1px solid rgba(184,144,80,0.3);
    font-size: 0.875rem;
    color: #2a1808;
  }
  .guest-table tbody td:first-child { padding-left: 0; }
  .action-cell { text-align: center; padding-right: 0; }
  .guest-table tbody tr:last-child td { border-bottom: none; }

  .guest-name-cell { font-weight: 600; white-space: nowrap; }

  .plus-one {
    display: block;
    font-size: 0.75rem;
    color: #7a5030;
    font-weight: 400;
  }

  .assign-select {
    background-image: var(--input-texture);
    background-size: 220px 220px;
    background-color: #f5edcf;
    border: 2px solid #3a2a10;
    box-shadow: 1px 2px 0 #3a2a10;
    border-radius: 0;
    color: #1a0e04;
    font-size: 0.8rem;
    padding: 0.25rem 0.4rem;
    font-family: 'Lora', 'Georgia', serif;
    cursor: pointer;
    width: 100%;
  }
  .assign-select:focus { outline: none; border-color: #26244a; }
  .assign-select option { background: #f5edcf; }

  /* ── Voting ── */
  .vote-summary { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; }
  .vote-row { display: flex; gap: 0.4rem; align-items: baseline; }

  .rcv-results {
    background: rgba(255,255,255,0.5);
    border: 1px solid #60a870;
    border-radius: 4px;
    padding: 1rem;
  }

  .rcv-results h3 {
    margin: 0 0 0.75rem;
    color: #1a6030;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rcv-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid rgba(184,144,80,0.3);
    font-size: 0.9rem;
  }
  .rcv-row:last-child { border-bottom: none; }
  .arrow { color: #cc4150; }

  .invite-photo-badge { font-size: 0.9rem; color: #1a6030; }
</style>
