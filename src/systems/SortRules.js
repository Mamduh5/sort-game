export const DEFAULT_SHELF_CAPACITY = 4;

export function canMove(shelves, sourceIndex, targetIndex, capacity = DEFAULT_SHELF_CAPACITY, options = {}) {
  if (sourceIndex === targetIndex) return false;

  const source = shelves[sourceIndex];
  const target = shelves[targetIndex];

  if (!source || !target) return false;
  if (source.length === 0) return false;
  if (target.length >= capacity) return false;

  const movingSpirit = source[source.length - 1];

  if (isBlessedShelf(targetIndex, options)) return true;
  if (target.length === 0) return true;

  const targetTopSpirit = target[target.length - 1];
  return movingSpirit === targetTopSpirit;
}

export function applyMove(shelves, sourceIndex, targetIndex, capacity = DEFAULT_SHELF_CAPACITY, options = {}) {
  if (!canMove(shelves, sourceIndex, targetIndex, capacity, options)) {
    return null;
  }

  const source = shelves[sourceIndex];
  const target = shelves[targetIndex];

  const movingSpirit = source.pop();
  target.push(movingSpirit);
  return movingSpirit;
}

export function undoMove(shelves, move) {
  if (!move) return null;

  const source = shelves[move.sourceIndex];
  const target = shelves[move.targetIndex];

  if (!source || !target || target.length === 0) {
    return null;
  }

  const movingSpirit = target[target.length - 1];

  if (movingSpirit !== move.spirit) {
    return null;
  }

  target.pop();
  source.push(movingSpirit);
  return movingSpirit;
}

export function findHintMove(shelves, capacity = DEFAULT_SHELF_CAPACITY, options = {}) {
  const sourceGroups = [
    getSourceIndexes(shelves, capacity, false),
    getSourceIndexes(shelves, capacity, true)
  ];

  for (const sourceIndexes of sourceGroups) {
    const matchingNormal = findFirstHintMove(shelves, capacity, options, sourceIndexes, {
      allowBlessedTarget: false,
      allowEmptyTarget: false,
      requireMatchingTop: true
    });
    if (matchingNormal) return matchingNormal;

    const matchingBlessed = findFirstHintMove(shelves, capacity, options, sourceIndexes, {
      allowBlessedTarget: true,
      onlyBlessedTarget: true,
      allowEmptyTarget: false,
      requireMatchingTop: true
    });
    if (matchingBlessed) return matchingBlessed;

    const emptyNormal = findFirstHintMove(shelves, capacity, options, sourceIndexes, {
      allowBlessedTarget: false,
      allowEmptyTarget: true,
      onlyEmptyTarget: true
    });
    if (emptyNormal) return emptyNormal;

    const blessedBuffer = findFirstHintMove(shelves, capacity, options, sourceIndexes, {
      allowBlessedTarget: true,
      onlyBlessedTarget: true,
      allowEmptyTarget: true
    });
    if (blessedBuffer) return blessedBuffer;
  }

  return null;
}

function findFirstHintMove(shelves, capacity, options, sourceIndexes, preferences) {
  for (const sourceIndex of sourceIndexes) {
    const source = shelves[sourceIndex];
    const movingSpirit = source[source.length - 1];

    for (let targetIndex = 0; targetIndex < shelves.length; targetIndex += 1) {
      const target = shelves[targetIndex];
      const blessedTarget = isBlessedShelf(targetIndex, options);

      if (!target) continue;
      if (!preferences.allowBlessedTarget && blessedTarget) continue;
      if (preferences.onlyBlessedTarget && !blessedTarget) continue;
      if (preferences.onlyEmptyTarget && target.length !== 0) continue;
      if (!preferences.allowEmptyTarget && target.length === 0) continue;
      if (preferences.requireMatchingTop && target[target.length - 1] !== movingSpirit) continue;

      if (canMove(shelves, sourceIndex, targetIndex, capacity, options)) {
        return { sourceIndex, targetIndex };
      }
    }
  }

  return null;
}

function getSourceIndexes(shelves, capacity, includeCompleted) {
  const indexes = [];

  for (let sourceIndex = 0; sourceIndex < shelves.length; sourceIndex += 1) {
    const source = shelves[sourceIndex];

    if (!source || source.length === 0) continue;
    if (!includeCompleted && isShelfComplete(source, capacity)) continue;
    indexes.push(sourceIndex);
  }

  return indexes;
}

export function isShelfComplete(shelf, capacity = DEFAULT_SHELF_CAPACITY) {
  if (!shelf || shelf.length !== capacity) return false;

  const firstSpirit = shelf[0];
  return shelf.every((spirit) => spirit === firstSpirit);
}

export function isSolved(shelves, capacity = DEFAULT_SHELF_CAPACITY) {
  return shelves.every((shelf) => {
    if (shelf.length === 0) return true;
    return isShelfComplete(shelf, capacity);
  });
}

export function isBlessedShelf(shelfIndex, options = {}) {
  const blessedShelves = options.blessedShelves ?? [];

  if (blessedShelves instanceof Set) return blessedShelves.has(shelfIndex);
  return Array.isArray(blessedShelves) && blessedShelves.includes(shelfIndex);
}
