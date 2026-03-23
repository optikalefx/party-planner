<script lang="ts">
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

<div class="admin">
  <header class="admin-header">
    <img src="/logo.png" alt="" class="header-logo" aria-hidden="true" />
    <h1>Mystery Invite</h1>
    <span class="header-badge">ADMIN DOSSIER</span>
    <div class="header-actions">
      {#if view === "detail"}
        <button class="btn btn-ghost" onclick={() => (view = "parties")}>← All Parties</button>
      {/if}
      <button class="btn btn-ghost btn-signout" onclick={() => signOut(client)}>Sign out</button>
      {#if userQuery.data?.image}
        <img src={userQuery.data.image} alt="profile" class="avatar" />
      {/if}
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
  .admin {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  /* ── Header ── */
  .admin-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem 1.5rem;
    background: var(--surface);
    border-radius: 0.125rem;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    position: relative;
  }

  .admin-header::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.75rem;
    bottom: 0.75rem;
    width: 2px;
    background: var(--primary);
  }

  .header-logo {
    width: 36px;
    height: 36px;
    border-radius: 0.125rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  .admin-header h1 {
    margin: 0;
    font-size: 1.15rem;
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--on-surface);
    letter-spacing: 0.02em;
  }

  .header-badge {
    font-family: var(--font-evidence);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: var(--secondary);
    opacity: 0.7;
    margin-right: auto;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn-signout { opacity: 0.5; font-size: 0.8rem; }
  .btn-signout:hover { opacity: 1; }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
  }

  .flash {
    background: var(--surface-container);
    color: var(--secondary-light);
    padding: 0.75rem 1rem;
    border-radius: 0.125rem;
    margin-bottom: 1.25rem;
    font-weight: 500;
    font-size: 0.875rem;
    border-left: 2px solid var(--secondary);
  }

  /* ── Party list section ── */
  .section {
    background: var(--surface);
    padding: 1.5rem;
    margin-bottom: 1.25rem;
    border-radius: 0.125rem;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
  }

  .section h2 {
    margin: 0;
    font-size: 0.7rem;
    color: var(--secondary);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 600;
    opacity: 0.8;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .section-header h2 { margin: 0; }

  .party-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .party-card {
    background: var(--surface-container-low);
    border: none;
    border-radius: 0.125rem;
    padding: 0.9rem 1.1rem;
    cursor: pointer;
    text-align: left;
    color: var(--on-surface);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: background 0.15s;
    font-family: inherit;
  }
  .party-card:hover { background: var(--surface-container); }
  .party-card strong { flex: 1; color: var(--on-surface); font-family: var(--font-display); }

  .invite-code {
    font-family: 'Inter', monospace;
    background: var(--surface-container-high);
    padding: 0.2rem 0.5rem;
    border-radius: 0.125rem;
    font-size: 0.75rem;
    color: var(--tertiary-muted);
    letter-spacing: 0.1em;
  }

  /* ── Detail layout (tabs) ── */
  .detail-layout {
    background: var(--surface);
    overflow: hidden;
    border-radius: 0.125rem;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
  }

  .tab-bar {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    background: var(--surface-container-low);
  }
  .tab-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
    padding: 0.8rem 1.2rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--on-surface-muted);
    font-size: 0.8rem;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    letter-spacing: 0.02em;
  }
  .tab-btn:hover { color: var(--on-surface); }
  .tab-btn.active {
    color: var(--on-surface);
    border-bottom-color: var(--primary);
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
    font-size: 0.65rem;
    color: var(--secondary);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding-bottom: 0.6rem;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 600;
    opacity: 0.8;
  }

  .form-hint {
    margin: 0;
    font-size: 0.83rem;
    color: var(--on-surface-muted);
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
    font-size: 0.7rem;
    color: var(--on-surface-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
  }

  input[type="text"],
  textarea,
  select {
    background: rgba(245, 240, 232, 0.07);
    border: 1px solid rgba(201, 169, 110, 0.15);
    border-radius: 2px;
    padding: 0.65rem 0.75rem;
    color: var(--on-surface);
    font-size: 0.9rem;
    font-family: 'Inter', system-ui, sans-serif;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  input[type="text"]:focus,
  textarea:focus,
  select:focus {
    outline: none;
    background: rgba(245, 240, 232, 0.1);
    border-color: var(--secondary);
    box-shadow: 0 0 0 1px rgba(201, 169, 110, 0.15);
  }
  input[type="text"]::placeholder,
  textarea::placeholder {
    color: var(--on-surface-faint);
  }
  input[type="file"] {
    background: rgba(245, 240, 232, 0.05);
    border: 1px dashed rgba(201, 169, 110, 0.2);
    border-radius: 2px;
    padding: 0.5rem 0.75rem;
    color: var(--on-surface-muted);
    font-size: 0.85rem;
    font-family: 'Inter', system-ui, sans-serif;
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
    color: var(--on-surface-muted);
  }
  .invite-link a { color: var(--secondary-light); }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    border-radius: 0.125rem;
    border: none;
    font-size: 0.8rem;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
    text-decoration: none;
    white-space: nowrap;
    letter-spacing: 0.03em;
  }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary), var(--primary-container));
    color: var(--on-surface);
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }

  .btn-secondary {
    background: var(--surface-container-highest);
    color: var(--secondary-light);
  }
  .btn-secondary:hover:not(:disabled) { filter: brightness(1.1); }

  .btn-ghost {
    background: transparent;
    color: var(--on-surface-muted);
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--on-surface);
    text-decoration: underline;
  }

  .btn-danger { background: transparent; color: var(--primary-light); }
  .btn-danger:hover:not(:disabled) { color: #ff6b7a; }

  .btn.tiny { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
  .btn-row { display: flex; gap: 0.5rem; }

  /* ── Characters ── */
  .char-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .char-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.85rem 1rem;
    background: var(--surface-container-low);
    border-radius: 0.125rem;
    transition: background 0.15s;
  }
  .char-row:hover { background: var(--surface-container); }

  .char-info { flex: 1; }
  .char-desc { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--on-surface-muted); }
  .char-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

  .char-edit {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-container-low);
    border-radius: 0.125rem;
    border-left: 2px solid var(--primary);
  }

  /* ── Misc ── */
  .muted { color: var(--on-surface-muted); font-size: 0.85rem; }
  .success { color: var(--secondary-light); font-size: 0.85rem; margin-top: 0.25rem; }
  .success a { color: var(--secondary-light); }

  .badge {
    padding: 0.2rem 0.6rem;
    border-radius: 0.125rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  .badge.yes { background: rgba(66, 185, 200, 0.15); color: var(--secondary-light); }
  .badge.no { background: rgba(152, 32, 62, 0.2); color: var(--primary-light); }
  .badge.pending { background: rgba(204, 198, 181, 0.1); color: var(--tertiary-muted); }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--on-surface);
  }

  /* ── Guest table ── */
  .guest-summary { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .guest-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .guest-table thead th {
    text-align: left;
    font-size: 0.65rem;
    color: var(--on-surface-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 0.5rem 0.5rem;
    font-weight: 600;
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
    font-size: 0.85rem;
    color: var(--on-surface);
  }
  .guest-table tbody td:first-child { padding-left: 0; }
  .action-cell { text-align: center; padding-right: 0; }

  .guest-table tbody tr {
    transition: background 0.1s;
  }
  .guest-table tbody tr:nth-child(even) {
    background: rgba(237, 221, 247, 0.02);
  }

  .guest-name-cell { font-weight: 600; white-space: nowrap; }

  .plus-one {
    display: block;
    font-size: 0.75rem;
    color: var(--on-surface-muted);
    font-weight: 400;
  }

  .assign-select {
    background: rgba(245, 240, 232, 0.07);
    border: 1px solid rgba(201, 169, 110, 0.15);
    border-radius: 2px;
    color: var(--on-surface);
    font-size: 0.8rem;
    padding: 0.3rem 0.4rem;
    font-family: 'Inter', system-ui, sans-serif;
    cursor: pointer;
    width: 100%;
  }
  .assign-select:focus { outline: none; border-bottom-color: var(--secondary); }
  .assign-select option { background: var(--surface-container); color: var(--on-surface); }

  /* ── Voting ── */
  .vote-summary { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; }
  .vote-row { display: flex; gap: 0.4rem; align-items: baseline; }

  .rcv-results {
    background: var(--surface-container-low);
    border-left: 2px solid var(--secondary);
    border-radius: 0.125rem;
    padding: 1rem;
  }

  .rcv-results h3 {
    margin: 0 0 0.75rem;
    color: var(--secondary-light);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 600;
  }

  .rcv-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0;
    font-size: 0.85rem;
  }
  .arrow { color: var(--primary-light); }

  .invite-photo-badge { font-size: 0.85rem; color: var(--secondary-light); }
</style>
