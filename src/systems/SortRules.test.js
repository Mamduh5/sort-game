import assert from "node:assert/strict";
import { SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import { applyMove, canMove, findHintMove, isShelfComplete, isSolved, undoMove } from "./SortRules.js";

const capacity = 4;

assert.equal(canMove([[], []], 0, 1, capacity), false, "empty source cannot move");
assert.equal(canMove([["fire"], ["leaf", "leaf", "leaf", "leaf"]], 0, 1, capacity), false, "full target rejects move");
assert.equal(canMove([["fire"], []], 0, 0, capacity), false, "same source and target rejects move");
assert.equal(canMove([["fire"], []], 0, 1, capacity), true, "empty target accepts top spirit");
assert.equal(canMove([["fire"], ["leaf", "fire"]], 0, 1, capacity), true, "matching target top accepts move");
assert.equal(canMove([["fire"], ["leaf"]], 0, 1, capacity), false, "different target top rejects move");

const shelves = [["leaf", "fire"], []];
assert.equal(applyMove(shelves, 0, 1), "fire");
assert.deepEqual(shelves, [["leaf"], ["fire"]]);

const invalidMoveShelves = [["fire"], ["leaf"]];
assert.equal(applyMove(invalidMoveShelves, 0, 1, capacity), null, "invalid apply returns null");
assert.deepEqual(invalidMoveShelves, [["fire"], ["leaf"]], "invalid apply does not mutate shelves");

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
assert.equal(findHintMove([["fire", "fire", "fire", "fire"], []], capacity), null, "hint skips completed shelves");

assert.equal(isShelfComplete(["moon", "moon", "moon", "moon"], capacity), true);
assert.equal(isShelfComplete(["moon", "moon"], capacity), false);
assert.equal(isShelfComplete(["moon", "leaf", "moon", "moon"], capacity), false);

assert.equal(isSolved([[], ["fire", "fire", "fire", "fire"]], capacity), true, "solved state accepts empty and complete shelves");
assert.equal(isSolved([["fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false, "partial shelf keeps level unsolved");
assert.equal(isSolved([["fire", "fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false, "partial same-type shelf is unsolved");

function stateKey(shelves) {
  return JSON.stringify(shelves);
}

function findSolutionDepth(level, stateLimit = 250000) {
  const start = level.shelves.map((shelf) => [...shelf]);
  const queue = [{ shelves: start, depth: 0 }];
  const seen = new Set([stateKey(start)]);

  for (let cursor = 0; cursor < queue.length && cursor < stateLimit; cursor += 1) {
    const current = queue[cursor];

    if (isSolved(current.shelves, level.capacity)) {
      return current.depth;
    }

    for (let sourceIndex = 0; sourceIndex < current.shelves.length; sourceIndex += 1) {
      for (let targetIndex = 0; targetIndex < current.shelves.length; targetIndex += 1) {
        if (!canMove(current.shelves, sourceIndex, targetIndex, level.capacity)) continue;

        const nextShelves = current.shelves.map((shelf) => [...shelf]);
        applyMove(nextShelves, sourceIndex, targetIndex, level.capacity);

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

assert.equal(SPIRIT_SORT_LEVELS.length, 12, "starter pack contains 12 levels");
assert.equal(new Set(SPIRIT_SORT_LEVELS.map((level) => level.id)).size, SPIRIT_SORT_LEVELS.length, "level IDs are unique");

SPIRIT_SORT_LEVELS.forEach((level) => {
  assert.equal(level.capacity, capacity, `level ${level.id} uses the default shelf capacity`);
  assert.equal(level.shelves.filter((shelf) => shelf.length === 0).length, 2, `level ${level.id} starts with two empty shelves`);

  level.shelves.forEach((shelf, shelfIndex) => {
    assert.ok(shelf.length <= level.capacity, `level ${level.id} shelf ${shelfIndex} does not exceed capacity`);
  });

  countSpirits(level).forEach((count, spirit) => {
    assert.equal(count % level.capacity, 0, `level ${level.id} has complete ${spirit} groups`);
  });

  const solutionDepth = findSolutionDepth(level);
  assert.notEqual(solutionDepth, null, `level ${level.id} is solvable`);
});

console.log("SortRules tests passed");
