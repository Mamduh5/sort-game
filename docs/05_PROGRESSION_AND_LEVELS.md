# Spirit Shelf Sort Progression And Levels

## Progress Save

Progress is stored in `localStorage` under:

```txt
spiritShelfSort.progress.v1
```

The save tracks:

- highest unlocked level ID
- completed levels
- best move count per completed level
- current or last played level
- muted state

If storage is missing, disabled, corrupted, or has an unsupported version, the game falls back to a safe default with Level 1 unlocked. Gameplay must continue even when saving fails.

Completing a level marks it complete, saves a lower best move count when earned, and unlocks the next level. Restarting and undoing never erase saved completion or best moves.

## Scene Flow

The scene flow is:

```txt
TitleScene -> SpiritSortScene
TitleScene -> LevelSelectScene -> SpiritSortScene
SpiritSortScene -> LevelSelectScene
```

`Continue` starts the saved current level when it is unlocked. If no valid save exists, it starts Level 1.

`LevelSelectScene` shows all levels in a compact grid. Locked levels are visible but cannot be played. Completed levels show their best move count when available.

## Level Pack Rules

The level pack currently contains 24 levels in `src/data/spiritSortLevels.js`.

Level rules:

- IDs are sequential from 1 to 24.
- Names are non-empty shrine/spirit themed strings.
- Capacity is 4.
- Levels use only existing spirit IDs: `fire`, `leaf`, `moon`, `cloud`, `star`.
- Most levels start with two empty shelves.
- Early levels are gentle, middle levels are moderate, and late levels are more mixed while staying fair.

## Adding Levels Safely

When adding or editing a level:

1. Keep the last array item as the top of the shelf.
2. Keep every shelf at or below capacity.
3. Make each spirit count divisible by capacity.
4. Keep at least two empty shelves unless there is a strong reason not to.
5. Use only known spirit IDs unless the renderer and asset fallback also support the new type.
6. Run `npm test` before considering the level valid.

The test suite validates level count, ID order, names, capacity, known spirit IDs, empty shelf space, group counts, solvability, and solver non-mutation.

## Spirit Personality Rules

Spirit personality is presentation-only. It must not affect sort rules or level solvability.

Current personality direction:

- Fire: energetic flicker and pulse.
- Leaf: gentle sway.
- Moon: slow calm float.
- Cloud: soft puffy bob.
- Star: brighter twinkle.

Personality effects should remain subtle on mobile and work with both PNG spirits and placeholder fallback spirits. Avoid large movement, flashing, or particle effects that hide spirit identity.
