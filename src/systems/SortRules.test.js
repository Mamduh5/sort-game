import assert from "node:assert/strict";
import { SPIRIT_SORT_LEVELS, SPIRIT_SORT_SPIRIT_IDS } from "../data/spiritSortLevels.js";
import {
  createDefaultProgress,
  getContinueLevelId,
  loadProgress,
  markLevelComplete,
  markLevelStarted,
  normalizeProgress,
  PROGRESS_SAVE_KEY,
  resetProgress,
  setBlessedShelfTutorialSeen,
  setMuted
} from "./ProgressSave.js";
import { applyMove, canMove, findHintMove, isBlessedShelf, isShelfComplete, isSolved, undoMove } from "./SortRules.js";

const capacity = 4;

assert.equal(canMove([[], []], 0, 1, capacity), false, "empty source cannot move");
assert.equal(canMove([["fire"], ["leaf", "leaf", "leaf", "leaf"]], 0, 1, capacity), false, "full target rejects move");
assert.equal(canMove([["fire"], []], 0, 0, capacity), false, "same source and target rejects move");
assert.equal(canMove([["fire"], []], 0, 1, capacity), true, "empty target accepts top spirit");
assert.equal(canMove([["fire"], ["leaf", "fire"]], 0, 1, capacity), true, "matching target top accepts move");
assert.equal(canMove([["fire"], ["leaf"]], 0, 1, capacity), false, "different target top rejects move");
assert.equal(canMove([["fire"], ["leaf"]], 0, 1, capacity, { blessedShelves: [1] }), true, "Blessed Shelf accepts mismatched top");
assert.equal(canMove([["fire"], ["leaf", "moon", "star", "cloud"]], 0, 1, capacity, { blessedShelves: [1] }), false, "Blessed Shelf rejects when full");
assert.equal(canMove([["leaf", "fire"], ["moon"]], 0, 1, capacity, { blessedShelves: [0] }), false, "moving out of Blessed Shelf to mismatched normal target is rejected");
assert.equal(canMove([["leaf", "fire"], []], 0, 1, capacity, { blessedShelves: [0] }), true, "moving out of Blessed Shelf to empty target works");
assert.equal(canMove([["leaf", "fire"], ["moon", "fire"]], 0, 1, capacity, { blessedShelves: [0] }), true, "moving out of Blessed Shelf to matching target works");
assert.equal(isBlessedShelf(1, { blessedShelves: [1] }), true, "array Blessed Shelf lookup works");
assert.equal(isBlessedShelf(1, { blessedShelves: new Set([1]) }), true, "set Blessed Shelf lookup works");

const shelves = [["leaf", "fire"], []];
assert.equal(applyMove(shelves, 0, 1), "fire");
assert.deepEqual(shelves, [["leaf"], ["fire"]]);

const invalidMoveShelves = [["fire"], ["leaf"]];
assert.equal(applyMove(invalidMoveShelves, 0, 1, capacity), null, "invalid apply returns null");
assert.deepEqual(invalidMoveShelves, [["fire"], ["leaf"]], "invalid apply does not mutate shelves");

const blessedMoveShelves = [["fire"], ["leaf"]];
assert.equal(applyMove(blessedMoveShelves, 0, 1, capacity, { blessedShelves: [1] }), "fire", "applyMove uses Blessed Shelf rule");
assert.deepEqual(blessedMoveShelves, [[], ["leaf", "fire"]], "Blessed Shelf receives mismatched spirit");

const undoShelves = [["leaf"], ["fire"]];
assert.equal(undoMove(undoShelves, { sourceIndex: 0, targetIndex: 1, spirit: "fire" }), "fire");
assert.deepEqual(undoShelves, [["leaf", "fire"], []], "undo returns moved spirit to source");

const invalidUndoShelves = [["leaf"], ["fire"]];
assert.equal(undoMove(invalidUndoShelves, { sourceIndex: 0, targetIndex: 1, spirit: "moon" }), null);
assert.deepEqual(invalidUndoShelves, [["leaf"], ["fire"]], "invalid undo does not mutate shelves");

const hintShelves = [["leaf", "fire"], ["moon", "fire"], []];
assert.deepEqual(findHintMove(hintShelves, capacity), { sourceIndex: 0, targetIndex: 1 }, "hint prefers matching target tops");
assert.deepEqual(hintShelves, [["leaf", "fire"], ["moon", "fire"], []], "hint does not mutate shelves");

assert.deepEqual(findHintMove([["leaf"], [], []], capacity), { sourceIndex: 0, targetIndex: 1 }, "hint falls back to empty targets");
assert.deepEqual(
  findHintMove([["fire"], ["leaf"], ["moon", "fire"]], capacity, { blessedShelves: [1] }),
  { sourceIndex: 0, targetIndex: 2 },
  "hint prefers normal matching move before Blessed buffer"
);
assert.deepEqual(
  findHintMove([["fire"], ["leaf"], ["moon"]], capacity, { blessedShelves: [1] }),
  { sourceIndex: 0, targetIndex: 1 },
  "hint uses Blessed Shelf as a temporary buffer"
);
assert.deepEqual(
  findHintMove([["fire", "fire", "fire", "fire"], ["leaf"], []], capacity),
  { sourceIndex: 1, targetIndex: 2 },
  "hint skips completed shelves while incomplete moves exist"
);

assert.equal(isShelfComplete(["moon", "moon", "moon", "moon"], capacity), true);
assert.equal(isShelfComplete(["moon", "moon"], capacity), false);
assert.equal(isShelfComplete(["moon", "leaf", "moon", "moon"], capacity), false);

assert.equal(isSolved([[], ["fire", "fire", "fire", "fire"]], capacity), true, "solved state accepts empty and complete shelves");
assert.equal(isSolved([["fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false, "partial shelf keeps level unsolved");
assert.equal(isSolved([["fire", "fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false, "partial same-type shelf is unsolved");
assert.equal(isSolved([["fire", "leaf", "fire", "leaf"], []], capacity), false, "mixed Blessed Shelf is not solved");
assert.equal(isSolved([["fire", "fire"], []], capacity), false, "partial Blessed Shelf is not solved");
assert.equal(isSolved([["fire", "fire", "fire", "fire"], []], capacity), true, "full same-type Blessed Shelf is solved");
assert.equal(isSolved([[], ["leaf", "leaf", "leaf", "leaf"]], capacity), true, "empty Blessed Shelf is solved");

function stateKey(shelves) {
  return JSON.stringify(shelves);
}

function findSolutionDepth(level, stateLimit = 250000) {
  const start = level.shelves.map((shelf) => [...shelf]);
  const queue = [{ shelves: start, depth: 0 }];
  const seen = new Set([stateKey(start)]);
  const options = { blessedShelves: level.blessedShelves ?? [] };

  for (let cursor = 0; cursor < queue.length && cursor < stateLimit; cursor += 1) {
    const current = queue[cursor];

    if (isSolved(current.shelves, level.capacity)) {
      return current.depth;
    }

    for (let sourceIndex = 0; sourceIndex < current.shelves.length; sourceIndex += 1) {
      for (let targetIndex = 0; targetIndex < current.shelves.length; targetIndex += 1) {
        if (!canMove(current.shelves, sourceIndex, targetIndex, level.capacity, options)) continue;

        const nextShelves = current.shelves.map((shelf) => [...shelf]);
        applyMove(nextShelves, sourceIndex, targetIndex, level.capacity, options);

        const nextKey = stateKey(nextShelves);
        if (!seen.has(nextKey)) {
          seen.add(nextKey);
          queue.push({ shelves: nextShelves, depth: current.depth + 1 });
        }
      }
    }
  }

  return null;
}

function countSpirits(level) {
  const counts = new Map();

  level.shelves.forEach((shelf) => {
    shelf.forEach((spirit) => {
      counts.set(spirit, (counts.get(spirit) ?? 0) + 1);
    });
  });

  return counts;
}

const knownSpiritIds = new Set(SPIRIT_SORT_SPIRIT_IDS);

assert.equal(SPIRIT_SORT_LEVELS.length, 36, "level pack contains 36 levels");
assert.equal(new Set(SPIRIT_SORT_LEVELS.map((level) => level.id)).size, SPIRIT_SORT_LEVELS.length, "level IDs are unique");

SPIRIT_SORT_LEVELS.forEach((level, index) => {
  assert.equal(level.id, index + 1, `level ${level.id} has a sequential ID`);
  assert.equal(typeof level.name, "string", `level ${level.id} has a string name`);
  assert.ok(level.name.trim().length > 0, `level ${level.id} has a non-empty name`);
  assert.equal(level.capacity, capacity, `level ${level.id} uses the default shelf capacity`);
  assert.ok(level.shelves.filter((shelf) => shelf.length === 0).length >= 2, `level ${level.id} has enough empty shelf space`);
  assert.ok(Array.isArray(level.blessedShelves ?? []), `level ${level.id} has optional Blessed Shelf data`);
  if (level.id <= 24) {
    assert.equal((level.blessedShelves ?? []).length, 0, `classic level ${level.id} has no Blessed Shelves`);
  } else {
    assert.ok((level.blessedShelves ?? []).length >= 1, `Blessed level ${level.id} has a Blessed Shelf`);
  }

  const originalShelves = level.shelves.map((shelf) => [...shelf]);
  const originalBlessedShelves = [...(level.blessedShelves ?? [])];

  level.shelves.forEach((shelf, shelfIndex) => {
    assert.ok(shelf.length <= level.capacity, `level ${level.id} shelf ${shelfIndex} does not exceed capacity`);
    shelf.forEach((spirit) => {
      assert.ok(knownSpiritIds.has(spirit), `level ${level.id} contains known spirit ${spirit}`);
    });
  });

  (level.blessedShelves ?? []).forEach((shelfIndex) => {
    assert.equal(Number.isInteger(shelfIndex), true, `level ${level.id} Blessed Shelf index is an integer`);
    assert.ok(shelfIndex >= 0 && shelfIndex < level.shelves.length, `level ${level.id} Blessed Shelf index is within shelf bounds`);
  });

  countSpirits(level).forEach((count, spirit) => {
    assert.equal(count % level.capacity, 0, `level ${level.id} has complete ${spirit} groups`);
  });

  const solutionDepth = findSolutionDepth(level);
  assert.notEqual(solutionDepth, null, `level ${level.id} is solvable`);
  assert.deepEqual(level.shelves, originalShelves, `solver does not mutate level ${level.id}`);
  assert.deepEqual(level.blessedShelves ?? [], originalBlessedShelves, `solver does not mutate Blessed Shelf data for level ${level.id}`);
});

function createMemoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

assert.deepEqual(normalizeProgress(null, SPIRIT_SORT_LEVELS), createDefaultProgress(), "missing progress normalizes to default");
assert.deepEqual(normalizeProgress({ version: 999 }, SPIRIT_SORT_LEVELS), createDefaultProgress(), "outdated progress normalizes to default");
assert.equal(
  normalizeProgress({ version: 1, unlockedLevelId: 1, completedLevels: {}, currentLevelId: 1, muted: false }, SPIRIT_SORT_LEVELS).seenBlessedShelfTutorial,
  false,
  "old progress without tutorial flag defaults safely"
);

const corruptStorage = createMemoryStorage({ [PROGRESS_SAVE_KEY]: "{bad json" });
assert.deepEqual(loadProgress(SPIRIT_SORT_LEVELS, corruptStorage), createDefaultProgress(), "corrupted storage falls back safely");

const storage = createMemoryStorage();
let progress = loadProgress(SPIRIT_SORT_LEVELS, storage);
progress = markLevelStarted(progress, 1, SPIRIT_SORT_LEVELS, storage);
progress = markLevelComplete(progress, 1, 12, SPIRIT_SORT_LEVELS, storage);
assert.equal(progress.completedLevels["1"].completed, true, "completion is saved");
assert.equal(progress.completedLevels["1"].bestMoves, 12, "first best move score is saved");
assert.equal(progress.unlockedLevelId, 2, "completing a level unlocks the next level");

progress = markLevelComplete(progress, 1, 14, SPIRIT_SORT_LEVELS, storage);
assert.equal(progress.completedLevels["1"].bestMoves, 12, "worse best move score is ignored");
progress = markLevelComplete(progress, 1, 8, SPIRIT_SORT_LEVELS, storage);
assert.equal(progress.completedLevels["1"].bestMoves, 8, "better best move score replaces old best");

progress = setMuted(progress, true, SPIRIT_SORT_LEVELS, storage);
assert.equal(loadProgress(SPIRIT_SORT_LEVELS, storage).muted, true, "muted state persists");
progress = setBlessedShelfTutorialSeen(progress, true, SPIRIT_SORT_LEVELS, storage);
assert.equal(loadProgress(SPIRIT_SORT_LEVELS, storage).seenBlessedShelfTutorial, true, "Blessed Shelf tutorial flag persists");
assert.equal(getContinueLevelId(progress, SPIRIT_SORT_LEVELS), 1, "continue prefers the saved current level when unlocked");

progress = markLevelStarted(progress, 2, SPIRIT_SORT_LEVELS, storage);
assert.equal(getContinueLevelId(progress, SPIRIT_SORT_LEVELS), 2, "continue uses last played unlocked level");
progress = resetProgress(SPIRIT_SORT_LEVELS, true, progress, storage);
assert.equal(progress.unlockedLevelId, 1, "reset locks progress back to level 1");
assert.equal(progress.muted, true, "reset can preserve mute state");
assert.equal(progress.seenBlessedShelfTutorial, false, "reset clears Blessed Shelf tutorial flag");
assert.deepEqual(progress.completedLevels, {}, "reset clears completed levels");

console.log("SortRules tests passed");
