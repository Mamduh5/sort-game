import assert from "node:assert/strict";
import { applyMove, canMove, isShelfComplete, isSolved } from "./SortRules.js";

const capacity = 4;

assert.equal(canMove([["fire"], []], 0, 1, capacity), true);
assert.equal(canMove([[], []], 0, 1, capacity), false);
assert.equal(canMove([["fire"], []], 0, 0, capacity), false);
assert.equal(canMove([["fire"], ["leaf"]], 0, 1, capacity), false);
assert.equal(canMove([["fire"], ["leaf", "fire"]], 0, 1, capacity), true);
assert.equal(canMove([["fire"], ["leaf", "leaf", "leaf", "leaf"]], 0, 1, capacity), false);

const shelves = [["leaf", "fire"], []];
assert.equal(applyMove(shelves, 0, 1), "fire");
assert.deepEqual(shelves, [["leaf"], ["fire"]]);

assert.equal(isShelfComplete(["moon", "moon", "moon", "moon"], capacity), true);
assert.equal(isShelfComplete(["moon", "moon"], capacity), false);
assert.equal(isShelfComplete(["moon", "leaf", "moon", "moon"], capacity), false);

assert.equal(isSolved([[], ["fire", "fire", "fire", "fire"]], capacity), true);
assert.equal(isSolved([["fire"], ["leaf", "leaf", "leaf", "leaf"]], capacity), false);

console.log("SortRules tests passed");
