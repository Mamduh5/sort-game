# AGENTS.md — Codex Instructions for Spirit Shelf Sort

## Project Context

This repository contains **Spirit Shelf Sort**, a cozy Phaser-style sorting puzzle game.

The player sorts tiny magical spirits into matching shrine shelves. The game is inspired by stack-sorting puzzle games, but it should have its own identity through:

- shrine shelves instead of tubes, bolts, nuts, or bottles
- tiny expressive spirits instead of plain objects
- cozy night-shrine visuals
- soft magical feedback
- simple, readable puzzle rules

Before implementing large changes, read the project docs:

```txt
docs/00_GAME_IDEA.md
docs/01_PLANNING.md
docs/02_IMPLEMENTATION.md
docs/03_NEXT_ACTIONS.md
```

## Main Development Goal

Build the smallest playable version first.

Priority order:

1. Make one level render correctly.
2. Make tap-to-select and tap-to-move work.
3. Make valid and invalid move rules reliable.
4. Add win detection.
5. Add simple movement feedback.
6. Add more levels.
7. Add final art later.

Do not start with menus, shops, ads, monetization, analytics, daily rewards, account systems, or large progression systems.

## Technical Assumptions

- Prefer Phaser 3 patterns if the project is Phaser-based.
- Prefer plain JavaScript unless the existing project uses TypeScript.
- Follow the repository's existing folder structure when it already exists.
- Keep the first version simple and readable.
- Avoid adding new dependencies unless clearly necessary.
- Do not rewrite unrelated systems while implementing the puzzle.

## Suggested Files

If these files do not already exist, create them:

```txt
src/scenes/SpiritSortScene.js
src/systems/SortRules.js
src/data/spiritSortLevels.js
```

If the project uses a different structure, adapt to the existing convention instead of forcing this exact layout.

## Game Rules

Each shelf is a stack of spirit IDs.

Recommended convention:

- the last item in the array is the top of the stack
- use `pop()` to remove from the source shelf
- use `push()` to add to the target shelf

Default shelf capacity:

```js
const SHELF_CAPACITY = 4;
```

A move is valid when:

1. source and target shelves are different
2. the source shelf is not empty
3. the target shelf is not full
4. the target shelf is empty, or its top spirit matches the moving spirit

The level is solved when every shelf is either empty or full of one spirit type.

## Implementation Rules

When working on game logic:

- Keep puzzle state separate from rendering when practical.
- Do not mutate level templates directly; clone level data before playing.
- Prevent input while a movement animation is running.
- Make invalid moves fail safely with no state corruption.
- Keep spirit rendering readable at small sizes.
- Prefer simple redraws for the MVP; optimize later only if needed.

## Placeholder Art Rules

Use placeholder graphics first.

Acceptable placeholders:

- colored circles or blobs
- simple emoji-like faces
- basic shelf rectangles
- soft glow circles
- simple particle dots

Do not block implementation on final generated art.

Final spirit image assets can be added later.

## Visual Feel

The game should feel:

- cozy
- magical
- cute
- soft
- readable
- low-stress

Avoid visuals that feel:

- too realistic
- too dark
- too busy
- too detailed to read when stacked
- too similar to nut, bolt, tube, or potion sort games

## Level Data Style

Use explicit level data.

Example:

```js
export const SPIRIT_SORT_LEVELS = [
  {
    id: 1,
    name: "First Glow",
    capacity: 4,
    shelves: [
      ["fire", "leaf", "fire", "leaf"],
      ["leaf", "fire", "leaf", "fire"],
      [],
      []
    ]
  }
];
```

Keep early levels easy.

Do not generate many levels before the core feel is tested.

## Testing Checklist

After changes, verify these cases:

- tapping an empty shelf first does nothing
- tapping a non-empty shelf selects it
- tapping the same shelf again deselects it
- moving to an empty shelf works
- moving to a matching top spirit works
- moving to a different top spirit is rejected
- moving into a full shelf is rejected
- no spirit disappears or duplicates
- win detection does not trigger early
- restart or reload restores the original level

If the repository has test, lint, or build commands, run the relevant command before finishing.

Common commands to try only if supported by the project:

```sh
npm run lint
npm run test
npm run build
```

Do not invent passing results. Report honestly if a command is missing or fails.

## Scope Control

For MVP tasks, avoid:

- economy systems
- ads
- backend services
- user accounts
- save-cloud sync
- shop UI
- level map UI
- daily challenge systems
- complex procedural level generation
- large refactors unrelated to the requested task

If a requested feature needs one of these, explain the tradeoff and implement the smallest safe version.

## Coding Style

Prefer:

- small functions
- clear names
- direct data flow
- simple Phaser containers or graphics
- constants for layout values
- comments only when they explain non-obvious decisions

Avoid:

- huge scene methods
- hidden global state
- duplicated rule logic
- magic numbers scattered everywhere
- premature architecture

## Expected Codex Workflow

For each implementation task:

1. Inspect the current project structure.
2. Read the relevant docs.
3. Identify the smallest safe change.
4. Edit only the files needed.
5. Run available validation commands.
6. Summarize changed files and validation results.

## Final Response Style

When finished, report:

- what changed
- which files were edited
- what validation was run
- any known limitations or next steps

Keep the summary concise.
