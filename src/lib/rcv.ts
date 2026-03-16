export interface VoteRecord {
  guestName: string;
  rankings: string[]; // characterId ordered by preference (1st, 2nd, 3rd)
  wantsDetective: boolean;
}

export interface Assignment {
  guestName: string;
  characterId: string; // characterId, "detective", or "unassigned"
}

export interface RCVResult {
  assignments: Assignment[];
  detectives: string[];
  unassigned: string[];
}

export function runRCV(votes: VoteRecord[], characterIds: string[]): RCVResult {
  const detectives = votes
    .filter((v) => v.wantsDetective)
    .map((v) => v.guestName);

  const actingVoters = votes.filter((v) => !v.wantsDetective);
  const assignments = new Map<string, string>(); // guestName -> characterId
  const assigned = new Set<string>(); // assigned guestNames
  const takenChars = new Set<string>(); // assigned characterIds

  // Track current preference pointer for each voter
  const prefIdx = new Map<string, number>();
  actingVoters.forEach((v) => prefIdx.set(v.guestName, 0));

  // Iterative assignment: keep resolving until stable
  let changed = true;
  while (changed) {
    changed = false;

    // Build: characterId -> list of guests currently pointing to it
    const wants = new Map<string, string[]>();

    for (const voter of actingVoters) {
      if (assigned.has(voter.guestName)) continue;

      let idx = prefIdx.get(voter.guestName)!;

      // Skip already-taken characters
      while (idx < voter.rankings.length && takenChars.has(voter.rankings[idx])) {
        idx++;
        prefIdx.set(voter.guestName, idx);
      }

      if (idx >= voter.rankings.length) continue; // exhausted preferences

      const charId = voter.rankings[idx];
      const list = wants.get(charId) ?? [];
      list.push(voter.guestName);
      wants.set(charId, list);
    }

    // Assign characters that exactly one guest wants
    for (const [charId, guests] of wants.entries()) {
      if (guests.length === 1) {
        const guest = guests[0];
        assignments.set(guest, charId);
        assigned.add(guest);
        takenChars.add(charId);
        changed = true;
      }
    }

    // Resolve conflicts: multiple guests want the same character
    // Keep the guest with the fewest remaining alternatives (they need it most)
    for (const [charId, guests] of wants.entries()) {
      if (guests.length <= 1 || takenChars.has(charId)) continue;

      const withRemainingPrefs = guests.map((g) => {
        const voter = actingVoters.find((v) => v.guestName === g)!;
        const idx = prefIdx.get(g)!;
        const remaining = voter.rankings.filter(
          (c, i) => i > idx && !takenChars.has(c)
        ).length;
        return { guestName: g, remaining };
      });

      // Sort ascending by remaining prefs — guest with fewest alternatives wins
      withRemainingPrefs.sort((a, b) => a.remaining - b.remaining);

      const winner = withRemainingPrefs[0].guestName;
      assignments.set(winner, charId);
      assigned.add(winner);
      takenChars.add(charId);

      // Bump losers to their next preference
      for (let i = 1; i < withRemainingPrefs.length; i++) {
        const loser = withRemainingPrefs[i].guestName;
        prefIdx.set(loser, (prefIdx.get(loser) ?? 0) + 1);
      }

      changed = true;
      break; // Restart after each conflict resolution
    }
  }

  // Assign remaining characters to guests who exhausted preferences
  const availableChars = characterIds.filter((c) => !takenChars.has(c));
  const unassignedGuests = actingVoters
    .filter((v) => !assigned.has(v.guestName))
    .map((v) => v.guestName);

  let charIdx = 0;
  const unassigned: string[] = [];
  for (const guestName of unassignedGuests) {
    if (charIdx < availableChars.length) {
      assignments.set(guestName, availableChars[charIdx++]);
    } else {
      unassigned.push(guestName);
    }
  }

  const allAssignments: Assignment[] = [
    ...detectives.map((g) => ({ guestName: g, characterId: "detective" })),
    ...actingVoters.map((v) => ({
      guestName: v.guestName,
      characterId: assignments.get(v.guestName) ?? "unassigned",
    })),
  ];

  return { assignments: allAssignments, detectives, unassigned };
}

// Tally first-choice votes per character (for standings display)
export function tallyFirstChoices(
  votes: VoteRecord[],
  characterIds: string[]
): Map<string, number> {
  const tally = new Map<string, number>();
  for (const charId of characterIds) tally.set(charId, 0);

  for (const vote of votes) {
    if (!vote.wantsDetective && vote.rankings.length > 0) {
      const top = vote.rankings[0];
      tally.set(top, (tally.get(top) ?? 0) + 1);
    }
  }

  return tally;
}
