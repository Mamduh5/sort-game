# Spirit Shelf Sort Asset Pipeline

This file documents the optional PNG assets that can replace the current code-drawn placeholders later. The game should keep working when these files are missing.

## Folder Structure

```txt
public/assets/spirit-sort/spirits/
public/assets/spirit-sort/shelves/
public/assets/spirit-sort/backgrounds/
public/assets/spirit-sort/ui/
public/assets/spirit-sort/audio/
```

## Expected Spirit Files

Spirit images are optional overrides for the current code-drawn spirits.

```txt
public/assets/spirit-sort/spirits/spirit-fire.png
public/assets/spirit-sort/spirits/spirit-leaf.png
public/assets/spirit-sort/spirits/spirit-moon.png
public/assets/spirit-sort/spirits/spirit-cloud.png
public/assets/spirit-sort/spirits/spirit-star.png
```

Recommended format:

- `128x128` PNG
- transparent background
- centered spirit silhouette
- readable at small size when stacked on shelves
- no text baked into the image

## Future Shelf And Background Assets

Shelves are still code-drawn. If shelf PNGs are added later, use:

```txt
public/assets/spirit-sort/shelves/shrine-shelf.png
```

Recommended format:

- `256x384` PNG
- transparent background
- enough inner space for four stacked spirits
- warm wooden shrine cubby style

Backgrounds are still code-drawn. If background PNGs are added later, use:

```txt
public/assets/spirit-sort/backgrounds/night-shrine.png
```

Recommended format:

- `960x640` PNG or larger
- cozy night-shrine atmosphere
- readable behind the board and HUD
- no important details near UI edges

## Runtime Fallback Behavior

The scene probes for the expected spirit PNGs at runtime. If a file exists, that spirit type uses the image. If the file is missing, the scene keeps using the current code-drawn placeholder spirit. Missing optional assets should not break gameplay.

## GPT Image Prompts

Use these prompts when generating future spirit PNGs. Generate each spirit as a separate transparent-background asset.

### Fire Spirit

Cute 2D game asset of a tiny magical fire spirit for a cozy night-shrine puzzle game, warm orange flame body, small friendly face, soft glow, centered composition, transparent background, readable at small size, no text, no full background.

### Leaf Spirit

Cute 2D game asset of a tiny magical leaf spirit for a cozy night-shrine puzzle game, green rounded body with a small sprout or leaf detail, small friendly face, soft glow, centered composition, transparent background, readable at small size, no text, no full background.

### Moon Spirit

Cute 2D game asset of a tiny magical moon spirit for a cozy night-shrine puzzle game, cool blue rounded body with a crescent moon mark, small friendly face, soft glow, centered composition, transparent background, readable at small size, no text, no full background.

### Cloud Spirit

Cute 2D game asset of a tiny magical cloud spirit for a cozy night-shrine puzzle game, fluffy pale body with gentle rounded puffs, small friendly face, soft glow, centered composition, transparent background, readable at small size, no text, no full background.

### Star Spirit

Cute 2D game asset of a tiny magical star spirit for a cozy night-shrine puzzle game, warm yellow rounded body with small sparkle points, small friendly face, soft glow, centered composition, transparent background, readable at small size, no text, no full background.
