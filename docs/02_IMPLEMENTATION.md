# Spirit Shelf Sort — Implementation Doc

## Technical Goal

Implement a small Phaser sorting puzzle scene with clean state management and simple rules.

This document assumes Phaser 3, but the logic can be adapted to other JavaScript game frameworks.

## Core Data Model

A level contains shelves.

Each shelf is an array of spirit IDs.

Example:

```js
const level = {
  id: 1,
  name: "First Glow",
  capacity: 4,
  shelves: [
    ["fire", "leaf", "fire", "leaf"],
    ["leaf", "fire", "leaf", "fire"],
    [],
    []
  ]
};
```

Recommended stack convention:

- last item is the top of the stack
- remove with `pop()`
- add with `push()`

## Spirit Type Definition

Use a simple config object for placeholder rendering.

```js
const SPIRIT_TYPES = {
  fire: {
    label: "Fire",
    color: 0xff7a3d,
    face: "•ᴗ•"
  },
  leaf: {
    label: "Leaf",
    color: 0x58c46b,
    face: "u_u"
  },
  moon: {
    label: "Moon",
    color: 0x7b8cff,
    face: "˘ᴗ˘"
  },
  cloud: {
    label: "Cloud",
    color: 0xd8f1ff,
    face: "o_o"
  },
  star: {
    label: "Star",
    color: 0xffd45c,
    face: "^_^"
  }
};
```

Later, replace the placeholder graphics with images.

## Important State Variables

```js
let shelves = [];
let selectedShelfIndex = null;
let capacity = 4;
let isAnimating = false;
```

### State Meaning

- `shelves`: current puzzle state
- `selectedShelfIndex`: source shelf selected by the player
- `capacity`: max spirits per shelf
- `isAnimating`: prevents input during movement animation

## Move Rules

A move is valid when:

```js
function canMove(shelves, sourceIndex, targetIndex, capacity) {
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
```

## Applying a Move

```js
function applyMove(shelves, sourceIndex, targetIndex) {
  const movingSpirit = shelves[sourceIndex].pop();
  shelves[targetIndex].push(movingSpirit);
  return movingSpirit;
}
```

## Win Condition

A level is solved when every shelf is either empty or contains only one spirit type.

```js
function isSolved(shelves, capacity) {
  return shelves.every((shelf) => {
    if (shelf.length === 0) return true;
    if (shelf.length !== capacity) return false;

    const first = shelf[0];
    return shelf.every((spirit) => spirit === first);
  });
}
```

Note: Requiring full shelves makes the win condition clearer. If you want a more forgiving version, allow partial same-type shelves, but full shelves are better for this genre.

## Suggested Phaser Scene Structure

```js
export default class SpiritSortScene extends Phaser.Scene {
  constructor() {
    super("SpiritSortScene");
  }

  preload() {
    // Load final assets later.
  }

  create() {
    this.capacity = 4;
    this.selectedShelfIndex = null;
    this.isAnimating = false;

    this.loadLevel(0);
    this.createBackground();
    this.createBoard();
  }

  loadLevel(levelIndex) {
    const level = SPIRIT_SORT_LEVELS[levelIndex];
    this.currentLevelIndex = levelIndex;
    this.capacity = level.capacity ?? 4;
    this.shelves = level.shelves.map((shelf) => [...shelf]);
  }

  createBackground() {
    // Draw temporary background.
  }

  createBoard() {
    // Draw shelves and spirits.
  }

  handleShelfTap(index) {
    // Selection and movement logic.
  }

  redrawBoard() {
    // Simple version: destroy and recreate board.
  }

  checkWin() {
    // Show win UI if solved.
  }
}
```

## Input Flow

When a shelf is tapped:

1. If animation is active, ignore input.
2. If no shelf is selected:
   - select tapped shelf if it has spirits
3. If a shelf is already selected:
   - if tapped same shelf, deselect
   - else try to move
4. If move is valid:
   - apply move
   - animate
   - check win
5. If move is invalid:
   - shake target shelf
   - keep or clear selection depending on feel

Recommended behavior:

- invalid move clears selection
- same shelf tap clears selection

## Handle Tap Example

```js
handleShelfTap(targetIndex) {
  if (this.isAnimating) return;

  if (this.selectedShelfIndex === null) {
    if (this.shelves[targetIndex].length > 0) {
      this.selectedShelfIndex = targetIndex;
      this.updateSelectionVisual();
    }
    return;
  }

  const sourceIndex = this.selectedShelfIndex;

  if (sourceIndex === targetIndex) {
    this.selectedShelfIndex = null;
    this.updateSelectionVisual();
    return;
  }

  if (!canMove(this.shelves, sourceIndex, targetIndex, this.capacity)) {
    this.playInvalidMoveFeedback(targetIndex);
    this.selectedShelfIndex = null;
    this.updateSelectionVisual();
    return;
  }

  this.moveSpirit(sourceIndex, targetIndex);
}
```

## Rendering Plan

### Shelf Layout

For mobile portrait:

```js
const shelfWidth = 90;
const shelfHeight = 260;
const shelfGap = 24;
const spiritSize = 56;
```

For responsive layout:

- calculate total shelf width
- center shelves horizontally
- use two rows if there are many shelves

Simple first version:

- 4 to 6 shelves in one row
- fixed camera size
- tune later

## Placeholder Spirit Rendering

Use Phaser graphics:

```js
function drawSpirit(scene, x, y, type) {
  const config = SPIRIT_TYPES[type];

  const container = scene.add.container(x, y);

  const glow = scene.add.circle(0, 0, 34, config.color, 0.18);
  const body = scene.add.circle(0, 0, 26, config.color, 1);
  const face = scene.add.text(0, 0, config.face, {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#202020"
  }).setOrigin(0.5);

  container.add([glow, body, face]);
  return container;
}
```

Later replacement:

```js
scene.add.image(x, y, `spirit-${type}`);
```

## Board Redraw Strategy

For the MVP, use a simple redraw approach.

```js
redrawBoard() {
  if (this.boardContainer) {
    this.boardContainer.destroy(true);
  }

  this.boardContainer = this.add.container(0, 0);

  // Recreate shelves and spirits based on this.shelves.
}
```

This is not the most optimized method, but it is simple and safe for a small puzzle game.

Optimize later only if needed.

## Animation Plan

### Select Shelf

- shelf outline glows
- top spirit floats up slightly

### Valid Move

- spirit moves in an arc to the target shelf
- spirit lands with small bounce
- target shelf glows briefly

### Invalid Move

- target shelf shakes left and right
- soft negative sound

### Completed Shelf

- shelf glows
- spirits bounce gently
- small sparkle particles

## Move Animation Pseudocode

```js
moveSpirit(sourceIndex, targetIndex) {
  this.isAnimating = true;

  const movingSpirit = this.shelves[sourceIndex][this.shelves[sourceIndex].length - 1];

  // Get start and end positions before changing state.
  const start = this.getTopSpiritPosition(sourceIndex);
  const end = this.getNextSpiritPosition(targetIndex);

  // Apply data state.
  applyMove(this.shelves, sourceIndex, targetIndex);

  // Create temporary moving sprite.
  const temp = this.createSpiritVisual(start.x, start.y, movingSpirit);

  // Redraw board without temp sprite if needed.

  this.tweens.add({
    targets: temp,
    x: end.x,
    y: end.y,
    duration: 220,
    ease: "Sine.easeInOut",
    onComplete: () => {
      temp.destroy();
      this.selectedShelfIndex = null;
      this.redrawBoard();
      this.isAnimating = false;
      this.checkWin();
    }
  });
}
```

## First Level Data File

Create:

```txt
src/data/spiritSortLevels.js
```

Suggested content:

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
  }
];
```

## Suggested Files To Create

```txt
src/scenes/SpiritSortScene.js
src/systems/SortRules.js
src/data/spiritSortLevels.js
```

## SortRules.js

```js
export function canMove(shelves, sourceIndex, targetIndex, capacity) {
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
  const movingSpirit = shelves[sourceIndex].pop();
  shelves[targetIndex].push(movingSpirit);
  return movingSpirit;
}

export function isShelfComplete(shelf, capacity) {
  if (shelf.length !== capacity) return false;
  const first = shelf[0];
  return shelf.every((spirit) => spirit === first);
}

export function isSolved(shelves, capacity) {
  return shelves.every((shelf) => {
    if (shelf.length === 0) return true;
    return isShelfComplete(shelf, capacity);
  });
}
```

## Testing Checklist

Test these cases manually:

- tap empty shelf first
- tap non-empty shelf first
- tap same shelf twice
- move to empty shelf
- move to matching top spirit
- try move to different top spirit
- try move into full shelf
- complete one shelf
- complete whole level
- restart level
- play next level

## Common Bugs

### Bug: Spirit order looks reversed

Cause:

The render order does not match the stack convention.

Fix:

If the last array item is the top, render from index 0 at the bottom and index `length - 1` at the top.

### Bug: Player can move during animation

Cause:

Input is not locked.

Fix:

Use `isAnimating`.

### Bug: Win triggers too early

Cause:

Partial same-type shelves are counted as complete.

Fix:

Require complete shelves to have `shelf.length === capacity`.

### Bug: Invalid move feels broken

Cause:

No feedback is shown.

Fix:

Add a small shake animation or red flash.

## Minimal Sound List

Later, add:

```txt
move_soft.wav
invalid_tap.wav
shelf_complete.wav
level_complete.wav
button_tap.wav
```

## Asset Plan

Temporary asset keys:

```txt
spirit-fire
spirit-leaf
spirit-moon
spirit-cloud
spirit-star
shelf-basic
background-night-shrine
ui-button
```

Suggested spirit image size:

```txt
128x128 PNG
transparent background
```

Suggested shelf image size:

```txt
128x320 PNG
transparent background
```

## Performance Notes

This game is lightweight.

It is safe to:

- redraw the board after moves
- use simple graphics
- use a small number of sprites
- keep logic in plain arrays

Do not over-engineer the MVP.

## Implementation Rule

First make it playable.

Then make it cute.

Then make it polished.

