export const PROGRESS_SAVE_KEY = "spiritShelfSort.progress.v1";
export const PROGRESS_SAVE_VERSION = 1;

export function createDefaultProgress() {
  return {
    version: PROGRESS_SAVE_VERSION,
    unlockedLevelId: 1,
    completedLevels: {},
    currentLevelId: 1,
    muted: false
  };
}

export function normalizeProgress(rawProgress, levels, fallback = createDefaultProgress()) {
  const levelIds = levels.map((level) => level.id);
  const maxLevelId = Math.max(...levelIds);
  const validLevelIds = new Set(levelIds);

  if (!rawProgress || typeof rawProgress !== "object" || rawProgress.version !== PROGRESS_SAVE_VERSION) {
    return clampProgress(fallback, validLevelIds, maxLevelId);
  }

  return clampProgress(rawProgress, validLevelIds, maxLevelId);
}

export function loadProgress(levels, storage = getStorage()) {
  if (!storage) return createDefaultProgress();

  try {
    const raw = storage.getItem(PROGRESS_SAVE_KEY);
    if (!raw) return createDefaultProgress();
    return normalizeProgress(JSON.parse(raw), levels);
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress, levels, storage = getStorage()) {
  const normalized = normalizeProgress(progress, levels);

  if (!storage) return normalized;

  try {
    storage.setItem(PROGRESS_SAVE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can be disabled or full; gameplay should keep running with in-memory progress.
  }

  return normalized;
}

export function markLevelStarted(progress, levelId, levels, storage = getStorage()) {
  const normalized = normalizeProgress(progress, levels);
  if (isLevelUnlocked(normalized, levelId)) {
    normalized.currentLevelId = levelId;
  }
  return saveProgress(normalized, levels, storage);
}

export function markLevelComplete(progress, levelId, moves, levels, storage = getStorage()) {
  const normalized = normalizeProgress(progress, levels);
  const completed = normalized.completedLevels[String(levelId)] ?? {};
  const bestMoves = Number.isFinite(completed.bestMoves)
    ? Math.min(completed.bestMoves, moves)
    : moves;
  const nextLevel = levels.find((level) => level.id > levelId);

  normalized.completedLevels[String(levelId)] = {
    completed: true,
    bestMoves
  };
  normalized.currentLevelId = levelId;

  if (nextLevel) {
    normalized.unlockedLevelId = Math.max(normalized.unlockedLevelId, nextLevel.id);
  }

  return saveProgress(normalized, levels, storage);
}

export function setMuted(progress, muted, levels, storage = getStorage()) {
  const normalized = normalizeProgress(progress, levels);
  normalized.muted = Boolean(muted);
  return saveProgress(normalized, levels, storage);
}

export function resetProgress(levels, preserveMuted = false, previousProgress = null, storage = getStorage()) {
  const nextProgress = createDefaultProgress();
  if (preserveMuted && previousProgress) {
    nextProgress.muted = Boolean(previousProgress.muted);
  }
  return saveProgress(nextProgress, levels, storage);
}

export function isLevelUnlocked(progress, levelId) {
  return levelId <= progress.unlockedLevelId;
}

export function getLevelCompletion(progress, levelId) {
  return progress.completedLevels[String(levelId)] ?? null;
}

export function getContinueLevelId(progress, levels) {
  const normalized = normalizeProgress(progress, levels);
  const currentLevel = levels.find((level) => level.id === normalized.currentLevelId);

  if (currentLevel && isLevelUnlocked(normalized, currentLevel.id)) {
    return currentLevel.id;
  }

  const unlockedLevel = [...levels].reverse().find((level) => isLevelUnlocked(normalized, level.id));
  return unlockedLevel?.id ?? 1;
}

function clampProgress(progress, validLevelIds, maxLevelId) {
  const nextProgress = createDefaultProgress();
  const unlockedLevelId = Number.isInteger(progress.unlockedLevelId) ? progress.unlockedLevelId : 1;
  const currentLevelId = Number.isInteger(progress.currentLevelId) ? progress.currentLevelId : 1;

  nextProgress.unlockedLevelId = clampLevelId(unlockedLevelId, validLevelIds, maxLevelId);
  nextProgress.currentLevelId = isLevelUnlocked(nextProgress, currentLevelId)
    ? clampLevelId(currentLevelId, validLevelIds, maxLevelId)
    : nextProgress.unlockedLevelId;
  nextProgress.muted = Boolean(progress.muted);
  nextProgress.completedLevels = normalizeCompletedLevels(progress.completedLevels, validLevelIds);

  return nextProgress;
}

function normalizeCompletedLevels(completedLevels, validLevelIds) {
  if (!completedLevels || typeof completedLevels !== "object") return {};

  return Object.entries(completedLevels).reduce((result, [levelId, completion]) => {
    const numericLevelId = Number(levelId);
    if (!validLevelIds.has(numericLevelId) || !completion?.completed) return result;

    result[String(numericLevelId)] = {
      completed: true
    };

    if (Number.isFinite(completion.bestMoves) && completion.bestMoves >= 0) {
      result[String(numericLevelId)].bestMoves = Math.floor(completion.bestMoves);
    }

    return result;
  }, {});
}

function clampLevelId(levelId, validLevelIds, maxLevelId) {
  const clamped = Math.max(1, Math.min(levelId, maxLevelId));
  if (validLevelIds.has(clamped)) return clamped;

  for (let candidate = clamped; candidate >= 1; candidate -= 1) {
    if (validLevelIds.has(candidate)) return candidate;
  }

  return 1;
}

function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
