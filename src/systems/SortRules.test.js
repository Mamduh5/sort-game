import assert from "node:assert/strict";
import { applyMove, canMove, isShelfComplete, isSolved, undoMove } from "./SortRules.js";

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

assert.equal(isShelfComplete(["moon", "moon", "moon", "moon"], capacity), true);
assert.equal(isShelfComplete(["moon", "moon"], capacity), false);
assert.equal(isShelfComplete(["moon", "leaf", "moon", "moon"], capacity), false);

assert.equal(isSolved([[], ["fire", "fire", "fire", "fire"]], capacity), true, "solved state accepts empty and complete shelves");
assert.equal(isSolved([["fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false, "partial shelf keeps level unsolved");
assert.equal(isSolved([["fire", "fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false, "partial same-type shelf is unsolved");

console.log("SortRules tests passed");
