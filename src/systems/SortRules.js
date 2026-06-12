export const DEFAULT_SHELF_CAPACITY = 4;

export function canMove(shelves, sourceIndex, targetIndex, capacity = DEFAULT_SHELF_CAPACITY) {
  if (sourceIndex === targetIndex) return false;

  const source = shelves[sourceIndex];
  const target = shelves[targetIndex];

  if (!source || !target) return false;
  if (source.length === 0) return false;
  if (target.length >= capacity) return false;

  const movingSpirit = source[source.length - 1];

  if (target.length === 0) return true;

  const targetTopSpirit = target[target.length - 1];
  return movingSpirit === targetTopSpirit;
}

export function applyMove(shelves, sourceIndex, targetIndex) {
  const source = shelves[sourceIndex];
  const target = shelves[targetIndex];

  if (!source || !target || source.length === 0) {
    return null;
  }

  const movingSpirit = source.pop();
  target.push(movingSpirit);
  return movingSpirit;
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
