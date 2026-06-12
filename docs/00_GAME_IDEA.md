# Spirit Shelf Sort — Game Idea Doc

## Working Title

**Spirit Shelf Sort**

Alternative names:
- Shrine Sort
- Tiny Spirit Sort
- Glow Sort
- Moon Shelf Puzzle
- Little Spirits

## Core Concept

**Spirit Shelf Sort** is a cozy magical sorting puzzle game where players organize tiny spirits into matching shrine shelves.

The game keeps the simple satisfaction of stack-sorting puzzle games, but changes the presentation from nuts, tubes, balls, or potions into a warm fantasy setting with cute spirits, wooden shrine shelves, soft glow effects, and calming animations.

## One-Sentence Pitch

Help lost tiny spirits return to their matching shrine shelves by sorting them into complete spirit families.

## Player Fantasy

The player is not just sorting objects. They are restoring peace to a magical shrine by guiding small lost spirits back to where they belong.

The feeling should be:

- cozy
- magical
- satisfying
- low-stress
- cute
- calm but mentally engaging

## Target Experience

A player should be able to open the game, solve a level in a few minutes, and feel relaxed, clever, and rewarded.

The game should be easy to understand instantly, but later levels can become more strategic.

## Core Gameplay

Each level contains several vertical shrine shelves.

Each shelf can hold a limited number of spirits, usually 4.

The player taps one shelf to select the top spirit, then taps another shelf to move it.

A move is valid when:

1. The source shelf is not empty.
2. The target shelf has space.
3. The target shelf is empty, or the top spirit on the target shelf matches the moving spirit.

The level is complete when every non-empty shelf contains only one spirit type.

## Main Difference From Similar Games

The game should not feel like a direct clone because the identity is built around:

- spirits instead of nuts, balls, tubes, or potions
- shrine shelves instead of containers
- magical glow and cozy night atmosphere
- emotional character pieces with faces and expressions
- completed shelves feeling like tiny restored homes
- optional special mechanics such as Blessed Shelves

## Visual Theme

### Setting

A quiet magical shrine at night.

Possible background elements:

- moonlight
- wooden shrine shelves
- soft lanterns
- tiny floating fireflies
- distant forest silhouettes
- gentle magical particles

### Spirit Style

Spirits should be:

- rounded
- readable at small size
- softly glowing
- expressive
- simple enough to stack clearly

Each spirit type should have one strong visual identity.

Example spirit types:

| Spirit Type | Color Direction | Visual Feature | Personality |
|---|---|---|---|
| Flame Spirit | Orange / red | Flame-shaped head | energetic |
| Leaf Spirit | Green | Leaf ears or sprout | sleepy |
| Moon Spirit | Blue / purple | Crescent mark | calm |
| Cloud Spirit | White / pale blue | fluffy shape | confused |
| Star Spirit | Yellow / gold | sparkle cheeks | excited |

## Mood References

The mood should feel like:

- cozy fantasy
- small magical creatures
- wooden shrine
- calm night
- soft glowing UI
- cute hand-drawn game asset style

Avoid making the game look too serious, realistic, dark, or overly detailed.

## Art Direction Rules

For consistency, spirit assets should follow these rules:

- transparent background
- centered character
- same canvas size
- similar scale
- strong silhouette
- simple face
- clear color difference
- readable when stacked
- one iconic feature per spirit type

Clarity is more important than detail.

## MVP Art Plan

Use placeholder art first:

- colored blobs
- simple faces
- basic glow circles
- shelf rectangles

Do not wait for final GPT-generated art before building the game.

Once the prototype feels fun, generate final assets.

## Future GPT Image Prompt Template

Use this later when generating final spirit images:

> Create a cute 2D game asset of a tiny magical [SPIRIT TYPE] spirit for a cozy sorting puzzle game. Soft rounded shape, simple expressive face, gentle glow, transparent background, centered composition, readable at small size, cozy fantasy style, hand-drawn mobile game asset, no text, no background.

Example replacements:

- flame
- leaf
- moon
- cloud
- star

## Design Pillars

### 1. Simple Rules

The player should understand the game after one move.

### 2. Cozy Presentation

The game should feel relaxing, magical, and cute.

### 3. Strong Readability

Players must easily see which spirits match.

### 4. Satisfying Movement

Every move should feel soft and pleasant.

### 5. Small Scope First

Build one fun level before adding menus, progression, shops, or many mechanics.

## First Playable Goal

The first playable version should include:

- one Phaser scene
- 5 shelves
- 4 spirit types
- shelf capacity of 4
- tap source and target
- valid move rules
- win detection
- placeholder spirit visuals
- small bounce animation when moving
- glow effect when a shelf is complete

## Success Criteria

The prototype is successful if:

- the player understands the rules without a long explanation
- moving spirits feels satisfying
- the puzzle can be solved
- completed shelves are visually rewarding
- the theme feels meaningfully different from nut/ball/tube sort games

