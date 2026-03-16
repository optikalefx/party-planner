<script lang="ts">
  import { useQuery, useConvexClient } from "convex-svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";
  import { runRCV } from "$lib/rcv";


  const client = useConvexClient();

  // ── State ────────────────────────────────────────────────────────────────────
  let selectedPartyId = $state<Id<"parties"> | null>(null);
  let view = $state<"parties" | "detail">("parties");
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
    view = "detail";
  }

  async function uploadFile(file: File): Promise<string> {
    console.log("[uploadFile] file:", file.name, file.type, file.size);
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
        console.log("[importCharacters] uploading image", charImportImageFile.name, charImportImageFile.type, charImportImageFile.size);
        storageId = await uploadFile(charImportImageFile);
        console.log("[importCharacters] uploaded, storageId:", storageId);
      }
      console.log("[importCharacters] calling parseCharacters action", { text: charImportText.slice(0, 100), storageId });
      const parsed = await client.action(api.parseCharacters.parseCharacters, {
        text: charImportText,
        storageId: storageId as any,
      }) as { name: string; description: string }[];
      console.log("[importCharacters] parsed:", parsed);
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

    // Pre-process manual assignments
    const manualGuests = guests.filter((g) => g.assignedCharacterId);
    const manualResults = manualGuests.map((g) => ({
      guestName: g.name,
      characterId: g.assignedCharacterId!,
    }));
    const takenByManual = new Set(
      manualGuests.map((g) => g.assignedCharacterId!).filter((id) => id !== "detective")
    );
    const manualNames = new Set(manualGuests.map((g) => g.name.toLowerCase()));

    // Exclude manually-assigned guests from votes and their characters from pool
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
    <h1>🎭 Party Planner Admin</h1>
    {#if view === "detail"}
      <button class="btn btn-ghost" onclick={() => (view = "parties")}>← All Parties</button>
    {/if}
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

      <!-- Left column -->
      <div class="col-main">

        <!-- Party Details -->
        <div class="section">
          <h2>Party Details</h2>

          <!-- Invite upload -->
          <div class="invite-upload">
            <label class="label">Import from invite (PDF or image)</label>
            <div class="upload-row">
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

          <div class="actions-row">
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

        <!-- Characters -->
        <div class="section">
          <h2>Characters</h2>

          <!-- Import characters via text paste or image -->
          <div class="invite-upload">
            <label class="label">Import characters with Claude</label>
            <p class="muted" style="margin: 0.4rem 0 0.75rem; font-size: 0.82rem;">Paste a character list or upload a photo of one — Claude will extract all names and descriptions.</p>
            <textarea
              bind:value={charImportText}
              rows="5"
              placeholder="Paste character list here…"
              disabled={parsingCharacters}
            ></textarea>
            <div class="upload-row" style="margin-top: 0.5rem;">
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

          {#if !characters.length}
            <p class="muted">No characters yet.</p>
          {:else}
            <div class="char-list">
              {#each characters as char}
                {#if editingCharId === char._id}
                  <div class="char-edit">
                    <input bind:value={charForm.name} type="text" placeholder="Character name" />
                    <textarea bind:value={charForm.description} rows="3" placeholder="Description"></textarea>
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
          {/if}

          <div class="add-char">
            <h3>Add Character</h3>
            <input bind:value={charForm.name} type="text" placeholder="Character name" disabled={editingCharId !== null} />
            <textarea bind:value={charForm.description} rows="3" placeholder="Character description" disabled={editingCharId !== null}></textarea>
            <button class="btn btn-primary" onclick={addCharacter} disabled={!charForm.name.trim() || editingCharId !== null}>
              Add Character
            </button>
          </div>
        </div>

        <!-- Theme -->
        <div class="section">
          <h2>Theme Generation</h2>
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
              <div class="photo-options">
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
              <div class="photo-options">
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
          <button
            class="btn btn-primary"
            onclick={generateTheme}
            disabled={(!themePrompt.trim() && !useInvitePhoto && !themePhotoFile) || generatingTheme}
          >
            {generatingTheme ? "Generating… (this takes ~30s)" : "Generate Theme with Claude"}
          </button>
          {#if party?.theme?.css}
            <p class="success">✓ Theme applied. <a href={partyUrl} target="_blank">Preview party page →</a></p>
          {/if}
        </div>
      </div>

      <!-- Right column -->
      <div class="col-side">

        <!-- Settings -->
        <div class="section">
          <h2>Settings</h2>
          {#if party}
            <label class="toggle-label">
              <input type="checkbox" checked={party.blindVoting} onchange={toggleBlindVoting} />
              Blind voting (guests can't see standings)
            </label>
          {/if}
        </div>

        <!-- Guests & RSVPs -->
        <div class="section">
          <h2>Guest List</h2>
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

          <div class="add-guest">
            <h3>Add Guest</h3>
            <div class="add-guest-fields">
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
              <div class="field">
                <label>Plus One (optional)</label>
                <input bind:value={guestForm.plusOne} type="text" placeholder="e.g. John Smith" />
              </div>
            </div>
            <button class="btn btn-primary" onclick={addGuest} disabled={!guestForm.name.trim()}>
              Add Guest
            </button>
          </div>
        </div>

        <!-- Votes & RCV -->
        <div class="section">
          <h2>Character Voting</h2>
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

            <button class="btn btn-primary" onclick={computeRCV}>
              Run Character Assignment (RCV)
            </button>

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
          {/if}
        </div>

      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: #0f0f13;
    color: #e8e6e1;
    min-height: 100vh;
  }

  .admin {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .admin-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #2a2a35;
  }

  .admin-header h1 {
    margin: 0;
    font-size: 1.5rem;
    flex: 1;
  }

  .flash {
    background: #1e3a2a;
    border: 1px solid #2e6a4a;
    color: #6ee7a0;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }

  .section {
    background: #16161f;
    border: 1px solid #2a2a35;
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .section h2 {
    margin: 0 0 1.25rem;
    font-size: 1.1rem;
    color: #b8b4c8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.85rem;
  }

  .section h3 {
    margin: 1rem 0 0.75rem;
    font-size: 0.95rem;
    color: #d4d0e8;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .section-header h2 { margin: 0; }

  .detail-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 900px) {
    .detail-layout { grid-template-columns: 1fr; }
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  .field.full { grid-column: 1 / -1; }

  label, .label {
    font-size: 0.8rem;
    color: #8885a0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  input[type="text"],
  input[type="file"],
  textarea,
  select {
    background: #0f0f13;
    border: 1px solid #2a2a35;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    color: #e8e6e1;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #6b5cf6;
  }

  textarea { resize: vertical; }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    border-radius: 6px;
    border: none;
    font-size: 0.9rem;
    font-family: inherit;
    cursor: pointer;
    transition: opacity 0.15s, background 0.15s;
    text-decoration: none;
  }

  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-primary { background: #6b5cf6; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #5a4de0; }

  .btn-secondary { background: #2a2a35; color: #e8e6e1; }
  .btn-secondary:hover:not(:disabled) { background: #353545; }

  .btn-ghost { background: transparent; color: #9995b0; border: 1px solid #2a2a35; }
  .btn-ghost:hover:not(:disabled) { background: #2a2a35; color: #e8e6e1; }

  .btn-danger { background: transparent; color: #e05050; border: 1px solid #3a2020; }
  .btn-danger:hover:not(:disabled) { background: #3a2020; }

  .btn.tiny { padding: 0.25rem 0.5rem; font-size: 0.8rem; }

  .btn-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; }

  .actions-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .invite-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    flex-wrap: wrap;
  }

  .invite-link a { color: #6b5cf6; }

  .invite-upload {
    background: #0f0f13;
    border: 1px dashed #2a2a35;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.25rem;
  }

  .upload-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  .party-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .party-card {
    background: #0f0f13;
    border: 1px solid #2a2a35;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    cursor: pointer;
    text-align: left;
    color: #e8e6e1;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: border-color 0.15s;
    font-family: inherit;
  }

  .party-card:hover { border-color: #6b5cf6; }
  .party-card strong { flex: 1; }

  .invite-code {
    font-family: monospace;
    background: #2a2a35;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #b8b4c8;
    letter-spacing: 0.1em;
  }

  .muted { color: #6660808; font-size: 0.9rem; }
  .muted { color: #666080; }

  .success { color: #6ee7a0; font-size: 0.9rem; margin-top: 0.75rem; }
  .success a { color: #6ee7a0; }

  .char-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }

  .char-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem;
    background: #0f0f13;
    border-radius: 6px;
    border: 1px solid #2a2a35;
  }

  .char-info { flex: 1; }
  .char-desc { margin: 0.25rem 0 0; font-size: 0.85rem; }
  .char-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

  .char-edit {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #0f0f13;
    border-radius: 6px;
    border: 1px solid #6b5cf6;
  }

  .add-char {
    border-top: 1px solid #2a2a35;
    padding-top: 1rem;
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: #e8e6e1;
    text-transform: none;
    letter-spacing: 0;
  }

  .guest-summary {
    display: flex;
    gap: 0.5rem;
    padding-bottom: 1rem;
    margin-bottom: 0;
    flex-wrap: wrap;
    border-bottom: 1px solid #2a2a35;
  }

  .badge {
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge.yes, .badge-yes { background: #1e3a2a; color: #6ee7a0; }
  .badge.no, .badge-no { background: #3a1e1e; color: #e07070; }
  .badge.pending, .badge-pending { background: #2a2820; color: #d4c86a; }

  .guest-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    margin-top: 0.75rem;
  }

  .guest-table thead th {
    text-align: left;
    font-size: 0.72rem;
    color: #6660a0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 0.5rem 0.5rem;
    font-weight: 600;
    border-bottom: 1px solid #2a2a35;
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
    border-bottom: 1px solid #1e1e28;
    font-size: 8px;
    & .badge {
      font-size: 8px;
    }
  }

  .guest-table tbody td:first-child { padding-left: 0; }
  .action-cell { text-align: center; padding-right: 0; }
  .guest-table tbody tr:last-child td { border-bottom: none; }

  .guest-name-cell {
    font-weight: 500;
    white-space: nowrap;
  }

  .plus-one {
    display: block;
    font-size: 0.75rem;
    color: #666080;
    font-weight: 400;
  }

  .assign-select {
    background: #0f0f13;
    border: 1px solid #2a2a35;
    border-radius: 5px;
    color: #9995b0;
    font-size: 8px;
    padding: 0.25rem 0.4rem;
    font-family: inherit;
    cursor: pointer;
    width: 100%;
  }

  .assign-select:focus { outline: none; border-color: #6b5cf6; }
  .assign-select option { background: #16161f; }

  .add-guest {
    border-top: 1px solid #2a2a35;
    padding-top: 1rem;
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .add-guest-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .vote-summary {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .vote-row { display: flex; gap: 0.4rem; align-items: baseline; }

  .rcv-results {
    margin-top: 1rem;
    background: #0f0f13;
    border: 1px solid #2e6a4a;
    border-radius: 8px;
    padding: 1rem;
  }

  .rcv-results h3 { margin: 0 0 0.75rem; color: #6ee7a0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }

  .rcv-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid #1a1a25;
    font-size: 0.9rem;
  }

  .rcv-row:last-child { border-bottom: none; }
  .arrow { color: #6b5cf6; }

  .photo-options {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .invite-photo-badge {
    font-size: 0.9rem;
    color: #6ee7a0;
  }
</style>
