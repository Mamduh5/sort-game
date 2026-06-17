# Spirit Shelf Sort — Planning Doc

## Project Goal

Build a small, polished, cozy sorting puzzle game inspired by stack-sorting games, but with a unique magical shrine and tiny spirit identity.

The first goal is not to make a full commercial game. The first goal is to create a fun, playable prototype that feels good enough to continue.

## Development Approach

Use a small-step approach.

Do not build everything at once.

The recommended order is:

1. Core sorting mechanic
2. Basic level rendering
3. Move animation
4. Win detection
5. Simple level restart
6. Better placeholder visuals
7. Sound and feedback
8. More levels
9. Final generated spirit art
10. Menus and progression

## MVP Scope

The MVP should include only the essential game loop.

### MVP Must Have

- Game scene
- Fixed screen layout
- Shelf containers
- Spirit pieces
- Tap-to-select source shelf
- Tap-to-move to target shelf
- Valid move checking
- Win condition
- Restart button
- At least 3 playable levels

### MVP Should Have

- Simple bounce movement
- Selected shelf highlight
- Completed shelf glow
- Basic sound effects
- Soft background
- Level number display

### MVP Does Not Need Yet

- level map
- currency
- shop
- daily challenge
- ads
- analytics
- account system
- cloud saves
- complex animations
- final art
- many spirit types
- monetization

## Suggested Folder Structure

```txt
project-root/
  public/
    assets/
      spirit-sort/
        spirits/
        ui/
        backgrounds/
        audio/
  src/
    scenes/
      SpiritSortScene.js
    systems/
      SortRules.js
      LevelManager.js
    data/
      spiritSortLevels.js
  docs/
    00_GAME_IDEA.md
    01_PLANNING.md
    02_IMPLEMENTATION.md
```

Adjust the structure if your current project already has its own conventions.

## Prototype Milestones

### Milestone 1 — Static Board

Goal: show a level on screen.

Tasks:

- create scene
- define level data
- draw shelves
- draw placeholder spirits
- position spirits in stacks

Done when:

- the player can see all shelves and spirits
- the layout fits the screen

### Milestone 2 — Basic Move Logic

Goal: allow the player to move spirits.

Tasks:

- detect shelf taps
- select source shelf
- select target shelf
- validate moves
- update level state
- redraw board

Done when:

- valid moves work
- invalid moves are ignored
- no pieces disappear or duplicate

### Milestone 3 — Juice Pass

Goal: make the game feel pleasant.

Tasks:

- add selected shelf highlight
- add spirit bounce animation
- add tiny particle effect on valid move
- add invalid move shake
- add completed shelf glow

Done when:

- moves feel satisfying
- feedback is clear

### Milestone 4 — Win State

Goal: detect and celebrate a solved puzzle.

Tasks:

- check every shelf after each move
- detect completed state
- show win message
- add next level button
- add restart button

Done when:

- level completion is reliable
- player can continue or restart

### Milestone 5 — Small Level Pack

Goal: make the game replayable.

Tasks:

- add 10 levels
- start very easy
- gradually increase difficulty
- test every level manually

Done when:

- the player can play several levels in sequence
- no level is obviously broken or impossible

## Priority Order

When energy is low, use this priority list:

1. Make one move work.
2. Make one level solvable.
3. Make movement feel nice.
4. Add three levels.
5. Add better visuals.
6. Add menus later.

Do not start with menus.

## Level Design Rules

### Basic Level Format

A level is an array of shelves.

Example:

```js
[
  ["fire", "leaf", "fire", "moon"],
  ["leaf", "moon", "leaf", "fire"],
  ["moon", "fire", "moon", "leaf"],
  [],
  []
]
```

The right side of each array can be treated as the top of the stack, or the left side can be treated as the top. Pick one convention and keep it consistent.

Recommended convention:

- last item in the array is the top of the stack
- use `pop()` to remove from source
- use `push()` to add to target

### Capacity

Default shelf capacity:

```js
const SHELF_CAPACITY = 4;
```

### Level Difficulty Guidelines

Easy levels:

- 3 spirit types
- 5 shelves
- 2 empty shelves

Medium levels:

- 4 spirit types
- 6 shelves
- 2 empty shelves

Hard levels:

- 5 spirit types
- 7 or 8 shelves
- 2 empty shelves

Avoid making early levels too crowded.

## First Ten Level Ideas

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
  },
  {
    id: 2,
    name: "Moon Visitors",
    capacity: 4,
    shelves: [
      ["fire", "moon", "fire", "moon"],
      ["moon", "leaf", "moon", "leaf"],
      ["leaf", "fire", "leaf", "fire"],
      [],
      []
    ]
  },
  {
    id: 3,
    name: "Cloudy Shrine",
    capacity: 4,
    shelves: [
      ["cloud", "fire", "leaf", "cloud"],
      ["leaf", "cloud", "fire", "leaf"],
      ["fire", "leaf", "cloud", "fire"],
      [],
      []
    ]
  },
  {
    id: 4,
    name: "Tiny Star",
    capacity: 4,
    shelves: [
      ["star", "fire", "moon", "star"],
      ["moon", "leaf", "star", "fire"],
      ["leaf", "star", "fire", "moon"],
      ["fire", "moon", "leaf", "leaf"],
      [],
      []
    ]
  },
  {
    id: 5,
    name: "Mixed Lanterns",
    capacity: 4,
    shelves: [
      ["fire", "leaf", "moon", "cloud"],
      ["leaf", "cloud", "fire", "moon"],
      ["moon", "fire", "cloud", "leaf"],
      ["cloud", "moon", "leaf", "fire"],
      [],
      []
    ]
  }
];
```

Add more only after these feel good.

## Risk List

### Risk: Game feels too similar to existing sort games

Solution:

- push the shrine/spirit theme
- add character expressions
- use shelf completion glow
- add one unique mechanic later

### Risk: Art is inconsistent

Solution:

- use strict asset prompt templates
- keep transparent backgrounds
- use same canvas size
- generate small batches only

### Risk: Levels become frustrating

Solution:

- keep early levels easy
- provide undo later
- avoid too many spirit types too soon

### Risk: Developer gets tired again

Solution:

- work in very small milestones
- avoid overbuilding systems
- keep the first version playful and simple

## Possible Future Features

Only consider these after the MVP is fun.

### Undo Button

Allows the player to reverse the last move.

### Hint Button

Suggests one valid move.

### Blessed Shelf

A special glowing shelf that can receive any spirit type while it has space.

### Spirit Expressions

Spirits can react when selected, moved, matched, or completed.

### Daily Shrine

One daily puzzle level.

### Collection Book

Players can unlock spirit descriptions.

### Cosmetic Shelves

Different shelf skins:

- bamboo shelf
- moon shelf
- forest shelf
- lantern shrine

## Recommended Next Step

Start with one file:

```txt
src/scenes/SpiritSortScene.js
```

Build the full first playable in one scene first.

Refactor into systems only after it works.
