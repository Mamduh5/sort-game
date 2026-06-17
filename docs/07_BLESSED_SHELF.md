# Blessed Shelf

Blessed Shelf is the first special shelf mechanic in Spirit Shelf Sort.

## Rule

A Blessed Shelf can receive any spirit type if it has space. Moving out of a Blessed Shelf still follows the normal target-shelf rule.

Normal shelves accept a spirit only when they are empty or their top spirit matches the moving spirit.

The win condition does not change. Every shelf, including Blessed Shelves, must be empty or full of one spirit type.

## Level Data

Blessed Shelves are optional level data:

```js
{
  id: 25,
  name: "Blessed Lantern",
  capacity: 4,
  shelves: [
    ["fire", "leaf", "moon", "fire"],
    ["leaf", "moon", "fire", "leaf"],
    ["moon", "fire", "leaf", "moon"],
    [],
    []
  ],
  blessedShelves: [4]
}
```

Missing `blessedShelves` behaves as an empty array. Indexes refer to entries in the `shelves` array.

## Content

Levels 1-24 are classic levels with no Blessed Shelves. Levels 25-36 introduce Blessed Shelves using existing spirit types only.

## Tutorial

Level 25 shows a short tutorial card the first time it starts. Dismissal is stored in localStorage as `seenBlessedShelfTutorial`. Reset Progress clears the tutorial flag.

## Tests

`npm test` validates:

- all 36 levels are sequential, valid, and solvable
- classic levels have no Blessed Shelves
- Blessed levels include valid Blessed Shelf indexes
- Blessed move rules work
- mixed or partial Blessed Shelves do not count as solved
- the tutorial save flag migrates safely
