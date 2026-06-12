import Phaser from "phaser";
import { cloneLevel, SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import { applyMove, canMove, findHintMove, isShelfComplete, isSolved, undoMove } from "../systems/SortRules.js";

const SPIRIT_TYPES = {
  fire: {
    label: "FI",
    name: "Fire",
    color: 0xff7a3d,
    glow: 0xffb36f,
    text: "#35120b"
  },
  leaf: {
    label: "LF",
    name: "Leaf",
    color: 0x64ca74,
    glow: 0xa6f0a7,
    text: "#0b2814"
  },
  moon: {
    label: "MO",
    name: "Moon",
    color: 0x8798ff,
    glow: 0xc4ccff,
    text: "#11173d"
  },
  cloud: {
    label: "CL",
    name: "Cloud",
    color: 0xd8f1ff,
    glow: 0xffffff,
    text: "#153040"
  },
  star: {
    label: "ST",
    name: "Star",
    color: 0xffd45c,
    glow: 0xffef9b,
    text: "#382500"
  }
};

const COLORS = {
  backgroundTop: 0x15162f,
  backgroundBottom: 0x262142,
  backgroundMid: 0x1d1a38,
  shrineShadow: 0x101225,
  shelfWood: 0x76513c,
  shelfWoodDark: 0x4d3028,
  shelfWoodLight: 0xa87956,
  shelfGold: 0xd7aa68,
  shelfInside: 0x2d243b,
  selected: 0xf7d783,
  complete: 0x9df0d2,
  invalid: 0xff6b7a,
  text: "#fff6dd",
  mutedText: "#c7bfe8"
};

const SOUND_TONES = {
  move: [
    { frequency: 440, duration: 0.07, delay: 0, gain: 0.03 },
    { frequency: 554, duration: 0.08, delay: 0.055, gain: 0.026 }
  ],
  invalid: [
    { frequency: 180, duration: 0.09, delay: 0, gain: 0.025, type: "triangle" }
  ],
  complete: [
    { frequency: 523, duration: 0.08, delay: 0, gain: 0.025 },
    { frequency: 659, duration: 0.09, delay: 0.06, gain: 0.023 },
    { frequency: 784, duration: 0.1, delay: 0.13, gain: 0.02 }
  ],
  win: [
    { frequency: 523, duration: 0.1, delay: 0, gain: 0.025 },
    { frequency: 659, duration: 0.1, delay: 0.08, gain: 0.023 },
    { frequency: 784, duration: 0.16, delay: 0.17, gain: 0.021 }
  ],
  button: [
    { frequency: 392, duration: 0.045, delay: 0, gain: 0.018 }
  ],
  undo: [
    { frequency: 554, duration: 0.055, delay: 0, gain: 0.022 },
    { frequency: 440, duration: 0.08, delay: 0.05, gain: 0.02 }
  ]
};

const BASE_LAYOUT = {
  shelfWidth: 116,
  shelfHeight: 284,
  shelfGap: 28,
  spiritSize: 52,
  slotGap: 58,
  boardTop: 230,
  selectedTopLift: 12,
  hudHeight: 118
};

export default class SpiritSortScene extends Phaser.Scene {
  constructor() {
    super("SpiritSortScene");
  }

  create() {
    this.currentLevelIndex = 0;
    this.selectedShelfIndex = null;
    this.isAnimating = false;
    this.hiddenSpirit = null;
    this.hasWon = false;
    this.moveHistory = [];
    this.moveCount = 0;
    this.isMuted = false;
    this.shelfViews = [];
    this.boardLayout = null;
    this.hintEffects = [];

    this.createBackground();
    this.loadLevel(0);
    this.createHud();
    this.redrawBoard();
    this.registerKeyboard();
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });
  }

  loadLevel(levelIndex) {
    const nextIndex = Phaser.Math.Clamp(levelIndex, 0, SPIRIT_SORT_LEVELS.length - 1);
    const level = cloneLevel(SPIRIT_SORT_LEVELS[nextIndex]);

    this.currentLevelIndex = nextIndex;
    this.currentLevel = level;
    this.capacity = level.capacity ?? 4;
    this.shelves = level.shelves;
    this.selectedShelfIndex = null;
    this.isAnimating = false;
    this.hiddenSpirit = null;
    this.hasWon = false;
    this.moveHistory = [];
    this.moveCount = 0;

    this.clearHintFeedback();

    if (this.winContainer) {
      this.winContainer.destroy(true);
      this.winContainer = null;
    }
  }

  handleResize() {
    if (this.isAnimating) return;

    this.createBackground();
    this.createHud();
    this.redrawBoard();

    if (this.hasWon) {
      this.showWinMessage();
    }
  }

  createBackground() {
    if (this.backgroundContainer) {
      this.backgroundContainer.destroy(true);
    }

    this.backgroundContainer = this.add.container(0, 0).setDepth(0);
    const { width, height } = this.scale;

    const sky = this.add.graphics();
    this.backgroundContainer.add(sky);
    sky.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1
    );
    sky.fillRect(0, 0, width, height);

    sky.fillGradientStyle(
      0x000000,
      0x000000,
      COLORS.backgroundMid,
      COLORS.backgroundMid,
      0,
      0,
      0.28,
      0.28
    );
    sky.fillRect(0, height * 0.52, width, height * 0.48);

    this.createMoonGlow();
    this.createDistantShrine();

    const mist = this.add.graphics();
    this.backgroundContainer.add(mist);
    mist.fillStyle(0x8b78a8, 0.08);
    mist.fillEllipse(width / 2, height - 98, width * 0.9, 72);
    mist.fillStyle(0xf7d783, 0.06);
    mist.fillEllipse(width / 2, height - 136, width * 0.62, 44);

    this.createFireflies();
  }

  createMoonGlow() {
    const { width, height } = this.scale;
    const moonX = width * 0.84;
    const moonY = Math.max(64, height * 0.13);

    this.backgroundContainer.add(this.add.circle(moonX, moonY, 92, 0xf6e8b7, 0.07));
    this.backgroundContainer.add(this.add.circle(moonX, moonY, 62, 0xf6e8b7, 0.12));
    this.backgroundContainer.add(this.add.circle(moonX, moonY, 42, 0xf6e8b7, 0.88));
    this.backgroundContainer.add(this.add.circle(moonX - 18, moonY - 8, 42, COLORS.backgroundTop, 1));

    for (let i = 0; i < 22; i += 1) {
      const x = 24 + ((i * 83) % Math.max(280, width - 48));
      const y = 46 + ((i * 47) % Math.max(100, height * 0.28));
      const alpha = 0.16 + (i % 4) * 0.05;
      this.backgroundContainer.add(this.add.circle(x, y, 1 + (i % 3), 0xffe9a8, alpha));
    }
  }

  createDistantShrine() {
    const { width, height } = this.scale;
    const scenery = this.add.graphics();
    this.backgroundContainer.add(scenery);

    scenery.fillStyle(0x0f1427, 0.86);
    scenery.fillTriangle(0, height, width * 0.18, height * 0.68, width * 0.38, height);
    scenery.fillTriangle(width * 0.2, height, width * 0.5, height * 0.64, width * 0.77, height);
    scenery.fillTriangle(width * 0.58, height, width * 0.84, height * 0.67, width, height);

    scenery.fillStyle(COLORS.shrineShadow, 0.9);
    const shrineX = width * 0.56;
    const shrineY = height * 0.54;
    const shrineScale = Phaser.Math.Clamp(width / 960, 0.46, 1);
    scenery.fillRect(shrineX - 86 * shrineScale, shrineY, 16 * shrineScale, 134 * shrineScale);
    scenery.fillRect(shrineX + 70 * shrineScale, shrineY, 16 * shrineScale, 134 * shrineScale);
    scenery.fillRect(shrineX - 120 * shrineScale, shrineY - 16 * shrineScale, 240 * shrineScale, 18 * shrineScale);
    scenery.fillRect(shrineX - 96 * shrineScale, shrineY - 38 * shrineScale, 192 * shrineScale, 14 * shrineScale);
    scenery.fillTriangle(shrineX - 136 * shrineScale, shrineY - 16 * shrineScale, shrineX, shrineY - 74 * shrineScale, shrineX + 136 * shrineScale, shrineY - 16 * shrineScale);
    scenery.fillRect(shrineX - 52 * shrineScale, shrineY + 10 * shrineScale, 106 * shrineScale, 90 * shrineScale);
    scenery.fillTriangle(shrineX - 80 * shrineScale, shrineY + 10 * shrineScale, shrineX, shrineY - 32 * shrineScale, shrineX + 84 * shrineScale, shrineY + 10 * shrineScale);
    scenery.fillStyle(0xf7d783, 0.18);
    scenery.fillRect(shrineX - 14 * shrineScale, shrineY + 24 * shrineScale, 28 * shrineScale, 52 * shrineScale);
  }

  createFireflies() {
    const { width, height } = this.scale;

    for (let i = 0; i < 16; i += 1) {
      const x = 32 + ((i * 61) % Math.max(260, width - 64));
      const y = height * 0.25 + ((i * 41) % Math.max(120, height * 0.42));
      const dot = this.add.circle(x, y, 2 + (i % 2), 0xffe8a0, 0.28);
      this.backgroundContainer.add(dot);

      this.tweens.add({
        targets: dot,
        alpha: 0.08,
        duration: 1200 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  createHud() {
    if (this.hudContainer) {
      this.hudContainer.destroy(true);
    }

    this.hudContainer = this.add.container(0, 0).setDepth(18);
    const hud = this.getHudLayout();
    const hudBand = this.add
      .rectangle(this.scale.width / 2, hud.bandHeight / 2, this.scale.width, hud.bandHeight, 0x17142d, 0.46);
    hudBand.setStrokeStyle(1, 0xd7aa68, 0.16);
    this.hudContainer.add(hudBand);

    this.titleText = this.add
      .text(hud.title.x, hud.title.y, "Spirit Shelf Sort", {
        fontFamily: "Arial",
        fontSize: `${hud.title.fontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(hud.title.originX, 0.5);
    this.titleText.setShadow(0, 2, "#050511", 4);
    this.hudContainer.add(this.titleText);

    this.levelText = this.add
      .text(hud.level.x, hud.level.y, "", {
        fontFamily: "Arial",
        fontSize: `${hud.level.fontSize}px`,
        color: COLORS.mutedText,
        wordWrap: { width: hud.level.wrapWidth, useAdvancedWrap: true }
      })
      .setOrigin(hud.level.originX, 0.5);
    this.levelText.setShadow(0, 1, "#050511", 3);
    this.hudContainer.add(this.levelText);

    this.moveText = this.add
      .text(hud.moves.x, hud.moves.y, "", {
        fontFamily: "Arial",
        fontSize: `${hud.moves.fontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(hud.moves.originX, 0.5);
    this.moveText.setShadow(0, 1, "#050511", 3);
    this.hudContainer.add(this.moveText);

    this.previousButton = this.createButton(hud.buttons.prev.x, hud.buttons.prev.y, hud.buttons.prev.width, "Prev", () => this.goToLevel(this.currentLevelIndex - 1));
    this.restartButton = this.createButton(hud.buttons.restart.x, hud.buttons.restart.y, hud.buttons.restart.width, "Restart", () => this.restartLevel());
    this.undoButton = this.createButton(hud.buttons.undo.x, hud.buttons.undo.y, hud.buttons.undo.width, "Undo", () => this.undoLastMove());
    this.hintButton = this.createButton(hud.buttons.hint.x, hud.buttons.hint.y, hud.buttons.hint.width, "Hint", () => this.showHint());
    this.muteButton = this.createButton(hud.buttons.mute.x, hud.buttons.mute.y, hud.buttons.mute.width, "Sound", () => this.toggleMute());
    this.nextButton = this.createButton(hud.buttons.next.x, hud.buttons.next.y, hud.buttons.next.width, "Next", () => this.goToLevel(this.currentLevelIndex + 1));
    this.hudContainer.add([this.previousButton, this.restartButton, this.undoButton, this.hintButton, this.muteButton, this.nextButton]);

    this.updateHud();
  }

  getHudLayout() {
    const width = this.scale.width;
    const isNarrow = width < 700;

    if (!isNarrow) {
      const buttonSpecs = [
        ["prev", 62],
        ["restart", 88],
        ["undo", 70],
        ["hint", 70],
        ["mute", 86],
        ["next", 62]
      ];
      const buttons = this.layoutButtonRow(width - 24, 42, buttonSpecs, 8);

      return {
        bandHeight: BASE_LAYOUT.hudHeight,
        title: { x: 48, y: 50, fontSize: 32, originX: 0 },
        level: { x: 50, y: 82, fontSize: 17, originX: 0, wrapWidth: Math.max(300, width - 610) },
        moves: { x: 50, y: 106, fontSize: 15, originX: 0 },
        buttonHeight: 38,
        buttonFontSize: 16,
        buttons
      };
    }

    const gap = width < 360 ? 6 : 8;
    const firstRow = this.layoutButtonRow(width / 2, 114, [
      ["prev", width < 360 ? 58 : 62],
      ["restart", width < 360 ? 78 : 84],
      ["undo", width < 360 ? 62 : 68]
    ], gap, true);
    const secondRow = this.layoutButtonRow(width / 2, 160, [
      ["hint", width < 360 ? 58 : 64],
      ["mute", width < 360 ? 78 : 86],
      ["next", width < 360 ? 58 : 62]
    ], gap, true);

    return {
      bandHeight: 190,
      title: { x: width / 2, y: 26, fontSize: width < 360 ? 22 : 24, originX: 0.5 },
      level: { x: width / 2, y: 58, fontSize: width < 360 ? 13 : 14, originX: 0.5, wrapWidth: width - 24 },
      moves: { x: width / 2, y: 82, fontSize: width < 360 ? 13 : 14, originX: 0.5 },
      buttonHeight: 42,
      buttonFontSize: width < 360 ? 13 : 14,
      buttons: { ...firstRow, ...secondRow }
    };
  }

  layoutButtonRow(anchorX, y, buttonSpecs, gap, centered = false) {
    const totalWidth = buttonSpecs.reduce((sum, [, buttonWidth]) => sum + buttonWidth, 0) + gap * (buttonSpecs.length - 1);
    let x = centered ? anchorX - totalWidth / 2 : anchorX - totalWidth;
    const buttons = {};

    buttonSpecs.forEach(([key, buttonWidth]) => {
      buttons[key] = {
        x: x + buttonWidth / 2,
        y,
        width: buttonWidth
      };
      x += buttonWidth + gap;
    });

    return buttons;
  }

  createButton(x, y, width, label, onClick) {
    const hud = this.getHudLayout();
    const container = this.add.container(x, y);
    const background = this.add
      .rectangle(0, 0, width, hud.buttonHeight, 0x342538, 0.96)
      .setStrokeStyle(2, COLORS.shelfGold, 0.78);
    const shine = this.add.rectangle(0, -hud.buttonHeight * 0.34, width - 12, 4, 0xffe2a5, 0.18);
    const leftCap = this.add.rectangle(-width / 2 + 7, 0, 5, hud.buttonHeight - 12, COLORS.shelfWoodLight, 0.7);
    const rightCap = this.add.rectangle(width / 2 - 7, 0, 5, hud.buttonHeight - 12, COLORS.shelfWoodLight, 0.7);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: `${hud.buttonFontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([background, shine, leftCap, rightCap, text]);
    container.buttonBackground = background;
    container.buttonText = text;
    container.setSize(width, hud.buttonHeight);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", onClick);
    container.on("pointerover", () => background.setFillStyle(0x4b3b68, 0.98));
    container.on("pointerout", () => background.setFillStyle(0x342538, 0.96));

    return container;
  }

  registerKeyboard() {
    this.input.keyboard.on("keydown-R", () => this.restartLevel());
    this.input.keyboard.on("keydown-N", () => this.goToLevel(this.currentLevelIndex + 1));
    this.input.keyboard.on("keydown-P", () => this.goToLevel(this.currentLevelIndex - 1));
    this.input.keyboard.on("keydown-U", () => this.undoLastMove());
    this.input.keyboard.on("keydown-BACKSPACE", () => this.undoLastMove());
    this.input.keyboard.on("keydown-H", () => this.showHint());
    this.input.keyboard.on("keydown-M", () => this.toggleMute());
  }

  updateHud() {
    this.levelText.setText(
      `Level ${this.currentLevelIndex + 1} / ${SPIRIT_SORT_LEVELS.length}: ${this.currentLevel.name}`
    );
    this.moveText.setText(`Moves: ${this.moveCount}`);

    this.previousButton.setAlpha(this.currentLevelIndex === 0 ? 0.45 : 1);
    this.nextButton.setAlpha(this.currentLevelIndex === SPIRIT_SORT_LEVELS.length - 1 ? 0.45 : 1);
    this.undoButton.setAlpha(this.canUndo() ? 1 : 0.45);
    this.hintButton.setAlpha(this.canUseHint() ? 1 : 0.45);
    this.muteButton.buttonText.setText(this.isMuted ? "Muted" : "Sound");
  }

  restartLevel() {
    if (this.isAnimating) return;

    this.playSound("button");
    this.loadLevel(this.currentLevelIndex);
    this.updateHud();
    this.redrawBoard();
  }

  goToLevel(levelIndex) {
    if (this.isAnimating) return;

    const nextIndex = Phaser.Math.Clamp(levelIndex, 0, SPIRIT_SORT_LEVELS.length - 1);
    if (nextIndex === this.currentLevelIndex) return;

    this.playSound("button");
    this.loadLevel(nextIndex);
    this.updateHud();
    this.redrawBoard();
  }

  canUndo() {
    return this.moveHistory.length > 0 && !this.isAnimating;
  }

  undoLastMove() {
    if (!this.canUndo()) return;

    const move = this.moveHistory.pop();
    const undoneSpirit = undoMove(this.shelves, move);

    if (!undoneSpirit) {
      this.updateHud();
      return;
    }

    this.selectedShelfIndex = null;
    this.hiddenSpirit = null;
    this.moveCount = Math.max(0, this.moveCount - 1);
    this.clearWinState();
    this.redrawBoard();
    this.playSound("undo");
    this.playUndoFeedback(move.sourceIndex);
    this.updateHud();
  }

  canUseHint() {
    return !this.isAnimating && !this.hasWon;
  }

  showHint() {
    if (!this.canUseHint()) return;

    const hint = findHintMove(this.shelves, this.capacity);

    if (!hint) {
      this.playSound("invalid");
      this.playHudPulse();
      return;
    }

    this.selectedShelfIndex = null;
    this.redrawBoard();
    this.playSound("button");
    this.playHintFeedback(hint.sourceIndex, hint.targetIndex);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateHud();

    if (!this.isMuted) {
      this.playSound("button");
    }
  }

  redrawBoard() {
    this.clearHintFeedback();

    if (this.boardContainer) {
      this.boardContainer.destroy(true);
    }

    this.boardLayout = this.getResponsiveBoardLayout();
    this.boardContainer = this.add.container(0, 0).setDepth(10);
    this.shelfViews = [];

    const positions = this.getShelfPositions();

    this.shelves.forEach((shelf, shelfIndex) => {
      const shelfView = this.createShelfView(shelfIndex, positions[shelfIndex], shelf);
      this.boardContainer.add(shelfView.container);
      this.shelfViews[shelfIndex] = shelfView;
    });
  }

  getResponsiveBoardLayout() {
    const width = this.scale.width;
    const height = this.scale.height;
    const shelfCount = this.shelves.length;
    const margin = Phaser.Math.Clamp(width * 0.045, 12, 44);
    const isNarrow = width < 700;
    const columns = isNarrow ? Math.min(shelfCount, shelfCount > 6 ? 4 : 3) : shelfCount;
    const rows = Math.ceil(shelfCount / columns);
    const gap = Phaser.Math.Clamp(isNarrow ? width * 0.03 : BASE_LAYOUT.shelfGap, 10, BASE_LAYOUT.shelfGap);
    const rowGap = rows > 1 ? Phaser.Math.Clamp(height * 0.035, 18, 34) : 0;
    const hudHeight = this.getHudLayout().bandHeight;
    const availableWidth = Math.max(280, width - margin * 2);
    const boardTop = hudHeight + Phaser.Math.Clamp(height * 0.035, 16, 38);
    const availableHeight = Math.max(220, height - boardTop - 40);
    const shelfWidth = Phaser.Math.Clamp(
      (availableWidth - gap * (columns - 1)) / columns,
      82,
      BASE_LAYOUT.shelfWidth
    );
    const shelfHeight = Phaser.Math.Clamp(
      (availableHeight - (rows - 1) * (rowGap + 28)) / rows,
      isNarrow ? 118 : 154,
      BASE_LAYOUT.shelfHeight
    );
    const scale = shelfHeight / BASE_LAYOUT.shelfHeight;
    const spiritSize = Phaser.Math.Clamp(BASE_LAYOUT.spiritSize * scale, isNarrow ? 28 : 34, BASE_LAYOUT.spiritSize);
    const slotGap = Math.max(spiritSize + 5, (shelfHeight - 58) / Math.max(1, this.capacity - 1));

    return {
      columns,
      rows,
      gap,
      rowGap,
      shelfWidth,
      shelfHeight,
      spiritSize,
      slotGap,
      boardTop,
      selectedTopLift: Phaser.Math.Clamp(BASE_LAYOUT.selectedTopLift * scale, 7, BASE_LAYOUT.selectedTopLift)
    };
  }

  getCurrentLayout() {
    if (!this.boardLayout) {
      this.boardLayout = this.getResponsiveBoardLayout();
    }

    return this.boardLayout;
  }

  getShelfPositions() {
    const layout = this.getCurrentLayout();
    const positions = [];

    for (let row = 0; row < layout.rows; row += 1) {
      const rowStart = row * layout.columns;
      const rowCount = Math.min(layout.columns, this.shelves.length - rowStart);
      const totalWidth = rowCount * layout.shelfWidth + (rowCount - 1) * layout.gap;
      const startX = (this.scale.width - totalWidth) / 2 + layout.shelfWidth / 2;
      const y = layout.boardTop + row * (layout.shelfHeight + layout.rowGap + 28);

      for (let column = 0; column < rowCount; column += 1) {
        positions[rowStart + column] = {
          x: startX + column * (layout.shelfWidth + layout.gap),
          y
        };
      }
    }

    return positions;
  }

  createShelfView(index, position, shelf) {
    const layout = this.getCurrentLayout();
    const container = this.add.container(position.x, position.y);
    const selected = this.selectedShelfIndex === index;
    const complete = isShelfComplete(shelf, this.capacity);

    const glowColor = selected ? COLORS.selected : COLORS.complete;
    const glowAlpha = selected ? 0.46 : complete ? 0.26 : 0;
    const glow = this.add.rectangle(0, layout.shelfHeight / 2, layout.shelfWidth + 28, layout.shelfHeight + 34, glowColor, glowAlpha);
    glow.setStrokeStyle(selected ? 4 : 2, glowColor, selected || complete ? 0.85 : 0);

    const roofHalf = layout.shelfWidth / 2 + 18;
    const roofInset = Math.max(24, layout.shelfWidth / 2 - 2);
    const roof = this.add
      .polygon(0, -20, [-roofHalf, 18, roofHalf, 18, roofInset, -10, -roofInset, -10], COLORS.shelfWoodDark, 1)
      .setStrokeStyle(2, COLORS.shelfGold, 0.7);
    const roofTrim = this.add.rectangle(0, -2, layout.shelfWidth + 34, 10, COLORS.shelfWoodLight, 1);
    const back = this.add
      .rectangle(0, layout.shelfHeight / 2, layout.shelfWidth, layout.shelfHeight, COLORS.shelfInside, 0.86)
      .setStrokeStyle(4, COLORS.shelfWoodLight, 0.92);
    const innerGlow = this.add.rectangle(0, layout.shelfHeight / 2, layout.shelfWidth - 24, layout.shelfHeight - 28, 0xf7d783, 0.05);

    const leftPost = this.add.rectangle(-layout.shelfWidth / 2 + 9, layout.shelfHeight / 2, 14, layout.shelfHeight + 18, COLORS.shelfWood, 1);
    const rightPost = this.add.rectangle(layout.shelfWidth / 2 - 9, layout.shelfHeight / 2, 14, layout.shelfHeight + 18, COLORS.shelfWood, 1);
    const baseShadow = this.add.rectangle(0, layout.shelfHeight + 13, layout.shelfWidth + 34, 10, COLORS.shelfWoodDark, 1);
    const base = this.add.rectangle(0, layout.shelfHeight + 5, layout.shelfWidth + 30, 20, COLORS.shelfWoodLight, 1);
    const top = this.add.rectangle(0, 11, layout.shelfWidth + 10, 8, COLORS.shelfWoodLight, 0.95);

    const planks = [];
    for (let i = 1; i < this.capacity; i += 1) {
      planks.push(this.add.rectangle(0, layout.shelfHeight - 62 - i * layout.slotGap, layout.shelfWidth - 26, 3, COLORS.shelfWoodLight, 0.24));
    }

    const charm = this.add.circle(0, layout.shelfHeight + 5, 5, COLORS.shelfGold, 0.8);
    const leftKnot = this.add.circle(-layout.shelfWidth / 2 + 9, 46, 3, COLORS.shelfWoodDark, 0.7);
    const rightKnot = this.add.circle(layout.shelfWidth / 2 - 9, Math.min(116, layout.shelfHeight - 36), 3, COLORS.shelfWoodDark, 0.7);

    const zone = this.add.zone(0, layout.shelfHeight / 2, Math.max(72, layout.shelfWidth + 32), layout.shelfHeight + 46);
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.handleShelfTap(index));

    container.add([
      glow,
      roof,
      roofTrim,
      back,
      innerGlow,
      ...planks,
      leftPost,
      rightPost,
      baseShadow,
      base,
      top,
      charm,
      leftKnot,
      rightKnot
    ]);

    if (selected) {
      const selectorHalo = this.add.circle(0, -32, 18, COLORS.selected, 0.3);
      const selectorArrow = this.add.triangle(0, -29, 0, 11, -11, -8, 11, -8, COLORS.selected, 0.92);
      container.add([selectorHalo, selectorArrow]);
    }

    shelf.forEach((spiritType, stackIndex) => {
      if (this.shouldHideSpirit(index, stackIndex)) return;

      const local = this.getSpiritLocalPosition(stackIndex);
      const isSelectedTop = selected && stackIndex === shelf.length - 1;
      const spirit = this.createSpiritVisual(
        local.x,
        local.y - (isSelectedTop ? layout.selectedTopLift : 0),
        spiritType
      );

      if (isSelectedTop) {
        spirit.setScale(1.06);
      }

      container.add(spirit);
    });

    if (complete) {
      for (let i = 0; i < 4; i += 1) {
        const sparkleX = -layout.shelfWidth * 0.32 + i * (layout.shelfWidth * 0.21);
        const sparkleY = 20 + (i % 2) * 16;
        container.add(this.add.circle(sparkleX, sparkleY, 3, COLORS.complete, 0.58));
      }

      const restoredText = this.add
        .text(0, layout.shelfHeight + 27, "restored", {
          fontFamily: "Arial",
          fontSize: `${layout.shelfWidth < 92 ? 11 : 13}px`,
          color: "#9df0d2",
          fontStyle: "bold"
        })
        .setOrigin(0.5);
      container.add(restoredText);
    }

    container.add(zone);

    return { container, position };
  }

  shouldHideSpirit(shelfIndex, stackIndex) {
    return (
      this.hiddenSpirit &&
      this.hiddenSpirit.shelfIndex === shelfIndex &&
      this.hiddenSpirit.stackIndex === stackIndex
    );
  }

  createSpiritVisual(x, y, spiritType) {
    const layout = this.getCurrentLayout();
    const config = SPIRIT_TYPES[spiritType] ?? SPIRIT_TYPES.fire;
    const container = this.add.container(x, y);
    const spiritScale = layout.spiritSize / BASE_LAYOUT.spiritSize;

    const glow = this.add.circle(0, 0, BASE_LAYOUT.spiritSize / 2 + 10, config.glow, 0.2);
    const shadow = this.add.ellipse(0, 22, 40, 10, 0x0c0b18, 0.18);
    const bodyParts = this.createSpiritBodyParts(spiritType, config);

    const eyeLeft = this.add.circle(-10, -7, 3, 0x1d1b2d, 1);
    const eyeRight = this.add.circle(10, -7, 3, 0x1d1b2d, 1);
    const label = this.add
      .text(0, 10, config.label, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: config.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([glow, shadow, ...bodyParts, eyeLeft, eyeRight, label]);
    container.setScale(spiritScale);
    return container;
  }

  createSpiritBodyParts(spiritType, config) {
    const outlineColor = 0xffffff;

    if (spiritType === "fire") {
      const flameTip = this.add.triangle(0, -22, 0, -28, -16, 10, 16, 10, config.color, 1);
      const body = this.add.ellipse(0, 4, 46, 44, config.color, 1).setStrokeStyle(3, outlineColor, 0.52);
      const innerFlame = this.add.triangle(0, -8, 0, -18, -7, 8, 7, 8, 0xffd18a, 0.82);
      return [flameTip, body, innerFlame];
    }

    if (spiritType === "leaf") {
      const body = this.add.ellipse(0, 4, 46, 44, config.color, 1).setStrokeStyle(3, outlineColor, 0.52);
      const stem = this.add.rectangle(0, -25, 5, 16, 0x2e7d45, 1);
      const leafLeft = this.add.ellipse(-8, -29, 18, 10, 0xa7ee9a, 1).setAngle(-28);
      const leafRight = this.add.ellipse(9, -29, 18, 10, 0xa7ee9a, 1).setAngle(28);
      return [stem, leafLeft, leafRight, body];
    }

    if (spiritType === "moon") {
      const body = this.add.ellipse(0, 4, 46, 44, config.color, 1).setStrokeStyle(3, outlineColor, 0.52);
      const crescent = this.add.circle(-11, -17, 8, 0xfff1b8, 0.88);
      const crescentCut = this.add.circle(-7, -19, 8, config.color, 1);
      return [body, crescent, crescentCut];
    }

    if (spiritType === "cloud") {
      const lower = this.add.ellipse(0, 9, 48, 30, config.color, 1).setStrokeStyle(3, outlineColor, 0.5);
      const puffLeft = this.add.circle(-16, -2, 17, config.color, 1).setStrokeStyle(2, outlineColor, 0.38);
      const puffTop = this.add.circle(1, -11, 19, config.color, 1).setStrokeStyle(2, outlineColor, 0.38);
      const puffRight = this.add.circle(17, 0, 16, config.color, 1).setStrokeStyle(2, outlineColor, 0.38);
      return [lower, puffLeft, puffTop, puffRight];
    }

    if (spiritType === "star") {
      const starAura = this.add.star(0, 3, 5, 20, 29, 0xffee9a, 0.5);
      const body = this.add.ellipse(0, 5, 42, 40, config.color, 1).setStrokeStyle(3, outlineColor, 0.52);
      const sparkleTop = this.add.star(18, -20, 4, 3, 7, 0xffffff, 0.82);
      const sparkleSide = this.add.star(-20, -7, 4, 2, 5, 0xffffff, 0.7);
      return [starAura, body, sparkleTop, sparkleSide];
    }

    return [this.add.ellipse(0, 4, 46, 44, config.color, 1).setStrokeStyle(3, outlineColor, 0.52)];
  }

  handleShelfTap(targetIndex) {
    if (this.isAnimating || this.hasWon) return;

    if (this.selectedShelfIndex === null) {
      if (this.shelves[targetIndex].length > 0) {
        this.selectedShelfIndex = targetIndex;
        this.redrawBoard();
        this.playSelectFeedback(targetIndex);
      }
      return;
    }

    const sourceIndex = this.selectedShelfIndex;

    if (sourceIndex === targetIndex) {
      this.selectedShelfIndex = null;
      this.redrawBoard();
      return;
    }

    if (!canMove(this.shelves, sourceIndex, targetIndex, this.capacity)) {
      this.selectedShelfIndex = null;
      this.redrawBoard();
      this.playSound("invalid");
      this.playInvalidMoveFeedback(targetIndex);
      return;
    }

    this.moveSpirit(sourceIndex, targetIndex);
  }

  moveSpirit(sourceIndex, targetIndex) {
    const layout = this.getCurrentLayout();
    const movingSpirit = this.shelves[sourceIndex][this.shelves[sourceIndex].length - 1];
    const start = this.getSpiritWorldPosition(sourceIndex, this.shelves[sourceIndex].length - 1);
    const end = this.getSpiritWorldPosition(targetIndex, this.shelves[targetIndex].length);

    this.isAnimating = true;
    this.selectedShelfIndex = null;

    const targetWasComplete = isShelfComplete(this.shelves[targetIndex], this.capacity);

    applyMove(this.shelves, sourceIndex, targetIndex, this.capacity);
    this.moveHistory.push({ sourceIndex, targetIndex, spirit: movingSpirit });
    this.moveCount += 1;
    this.updateHud();
    this.hiddenSpirit = {
      shelfIndex: targetIndex,
      stackIndex: this.shelves[targetIndex].length - 1
    };
    this.redrawBoard();

    const movingVisual = this.createSpiritVisual(start.x, start.y, movingSpirit).setDepth(40);
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - Phaser.Math.Clamp(layout.shelfHeight * 0.3, 42, 84)
    };

    this.tweens.add({
      targets: movingVisual,
      x: midPoint.x,
      y: midPoint.y,
      scale: 1.08,
      duration: 150,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: movingVisual,
          x: end.x,
          y: end.y,
          scale: 1,
          duration: 170,
          ease: "Sine.easeIn",
          onComplete: () => {
            movingVisual.destroy();
            this.hiddenSpirit = null;
            this.redrawBoard();
            this.playLandingFeedback(
              targetIndex,
              !targetWasComplete && isShelfComplete(this.shelves[targetIndex], this.capacity)
            );
            this.playSound(isShelfComplete(this.shelves[targetIndex], this.capacity) && !targetWasComplete ? "complete" : "move");
            this.isAnimating = false;
            this.updateHud();
            this.checkWin();
          }
        });
      }
    });
  }

  getSpiritLocalPosition(stackIndex) {
    const layout = this.getCurrentLayout();

    return {
      x: 0,
      y: layout.shelfHeight - 38 - stackIndex * layout.slotGap
    };
  }

  getSpiritWorldPosition(shelfIndex, stackIndex) {
    const shelfPosition = this.getShelfPositions()[shelfIndex];
    const local = this.getSpiritLocalPosition(stackIndex);

    return {
      x: shelfPosition.x + local.x,
      y: shelfPosition.y + local.y
    };
  }

  playSelectFeedback(shelfIndex) {
    const view = this.shelfViews[shelfIndex];
    if (!view) return;

    this.tweens.add({
      targets: view.container,
      y: view.position.y - 8,
      duration: 90,
      yoyo: true,
      ease: "Sine.easeOut"
    });
  }

  playLandingFeedback(shelfIndex, completedNow = false) {
    const view = this.shelfViews[shelfIndex];
    if (!view) return;
    const layout = this.getCurrentLayout();

    this.tweens.add({
      targets: view.container,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 90,
      yoyo: true,
      ease: "Sine.easeOut"
    });

    this.createSparkles(view.position.x, view.position.y + Math.min(58, layout.shelfHeight * 0.25), completedNow ? 12 : 6);

    if (completedNow) {
      this.tweens.add({
        targets: view.container,
        alpha: {
          from: 0.84,
          to: 1
        },
        duration: 130,
        yoyo: true,
        ease: "Sine.easeOut"
      });
    }
  }

  playUndoFeedback(shelfIndex) {
    const view = this.shelfViews[shelfIndex];
    if (!view) return;

    this.tweens.add({
      targets: view.container,
      y: view.position.y - 6,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 90,
      yoyo: true,
      ease: "Sine.easeOut"
    });
  }

  playHintFeedback(sourceIndex, targetIndex) {
    this.clearHintFeedback();

    const sourceView = this.shelfViews[sourceIndex];
    const targetView = this.shelfViews[targetIndex];
    if (!sourceView || !targetView) return;

    const sourcePulse = this.createHintPulse(sourceView.position.x, sourceView.position.y, COLORS.selected);
    const targetPulse = this.createHintPulse(targetView.position.x, targetView.position.y, COLORS.complete);
    const guideLine = this.add
      .line(
        0,
        0,
        sourceView.position.x,
        sourceView.position.y + 12,
        targetView.position.x,
        targetView.position.y + 12,
        COLORS.shelfGold,
        0.72
      )
      .setOrigin(0)
      .setLineWidth(4)
      .setDepth(38);
    this.hintEffects.push(sourcePulse, targetPulse, guideLine);

    [sourcePulse, targetPulse].forEach((pulse) => {
      this.tweens.add({
        targets: pulse,
        scaleX: 1.12,
        scaleY: 1.06,
        alpha: 0,
        duration: 720,
        ease: "Sine.easeOut",
        onComplete: () => pulse.destroy()
      });
    });

    this.tweens.add({
      targets: guideLine,
      alpha: 0,
      duration: 680,
      ease: "Sine.easeOut",
      onComplete: () => guideLine.destroy()
    });
  }

  clearHintFeedback() {
    if (!this.hintEffects) return;

    this.hintEffects.forEach((effect) => {
      if (effect?.active) {
        effect.destroy();
      }
    });
    this.hintEffects = [];
  }

  createHintPulse(x, y, color) {
    const layout = this.getCurrentLayout();
    return this.add
      .rectangle(x, y + layout.shelfHeight / 2, layout.shelfWidth + 42, layout.shelfHeight + 56, color, 0.22)
      .setStrokeStyle(4, color, 0.9)
      .setDepth(37);
  }

  playHudPulse() {
    if (!this.moveText) return;

    this.tweens.add({
      targets: this.moveText,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut"
    });
  }

  playInvalidMoveFeedback(shelfIndex) {
    const view = this.shelfViews[shelfIndex];
    if (!view) return;
    const layout = this.getCurrentLayout();

    const flash = this.add
      .rectangle(view.position.x, view.position.y + layout.shelfHeight / 2, layout.shelfWidth + 34, layout.shelfHeight + 40, COLORS.invalid, 0.34)
      .setDepth(35);
    flash.setStrokeStyle(3, COLORS.invalid, 0.85);

    this.tweens.add({
      targets: view.container,
      x: view.position.x + 12,
      duration: 42,
      repeat: 4,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        view.container.x = view.position.x;
      }
    });

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 240,
      onComplete: () => flash.destroy()
    });
  }

  createSparkles(x, y, count = 7) {
    for (let i = 0; i < count; i += 1) {
      const sparkle = this.add.circle(x, y, 3, 0xfff0b6, 0.9).setDepth(36);
      const angle = (Math.PI * 2 * i) / count;
      const distance = 28 + (i % 2) * 18;

      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 360,
        ease: "Sine.easeOut",
        onComplete: () => sparkle.destroy()
      });
    }
  }

  checkWin() {
    if (!isSolved(this.shelves, this.capacity)) return;

    this.hasWon = true;
    this.playSound("win");
    this.showWinMessage();
  }

  clearWinState() {
    this.hasWon = false;

    if (this.winContainer) {
      this.winContainer.destroy(true);
      this.winContainer = null;
    }
  }

  showWinMessage() {
    if (this.winContainer) {
      this.winContainer.destroy(true);
    }

    const width = this.scale.width;
    const hud = this.getHudLayout();
    const panelWidth = Math.min(500, width - 24);
    const panelHeight = width < 420 ? 178 : 154;
    const panelY = hud.bandHeight + panelHeight / 2 + 14;
    const titleFontSize = width < 420 ? 23 : 28;
    const detailFontSize = width < 420 ? 13 : 16;
    const buttonY = width < 420 ? 58 : 50;

    this.winContainer = this.add.container(width / 2, panelY).setDepth(50);

    const panel = this.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x211c37, 0.92)
      .setStrokeStyle(3, COLORS.complete, 0.9);
    const title = this.add
      .text(0, -panelHeight * 0.34, "Level complete", {
        fontFamily: "Arial",
        fontSize: `${titleFontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const isLastLevel = this.currentLevelIndex === SPIRIT_SORT_LEVELS.length - 1;
    const detail = this.add
      .text(0, -18, isLastLevel ? "All 12 shrine levels are restored." : "Shrine restored. Next level is ready.", {
        fontFamily: "Arial",
        fontSize: `${detailFontSize}px`,
        color: "#bfeadf",
        align: "center",
        wordWrap: { width: panelWidth - 30, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    const moveSummary = this.add
      .text(0, 16, `Completed in ${this.moveCount} moves`, {
        fontFamily: "Arial",
        fontSize: `${detailFontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const restartButton = this.createWinButton(-Math.min(74, panelWidth * 0.19), buttonY, Math.min(124, panelWidth * 0.38), "Restart", () => this.restartLevel());
    const nextButton = this.createWinButton(
      Math.min(78, panelWidth * 0.2),
      buttonY,
      Math.min(132, panelWidth * 0.4),
      isLastLevel ? "All Done" : "Next Level",
      () => this.goToLevel(this.currentLevelIndex + 1)
    );
    nextButton.setAlpha(isLastLevel ? 0.45 : 1);

    this.winContainer.add([panel, title, detail, moveSummary, restartButton, nextButton]);
    this.tweens.add({
      targets: this.winContainer,
      scale: {
        from: 0.92,
        to: 1
      },
      duration: 160,
      ease: "Back.easeOut"
    });
  }

  createWinButton(x, y, width, label, onClick) {
    const container = this.add.container(x, y);
    const background = this.add
      .rectangle(0, 0, width, 34, 0x342538, 0.96)
      .setStrokeStyle(2, COLORS.shelfGold, 0.72);
    const shine = this.add.rectangle(0, -11, width - 12, 4, 0xffe2a5, 0.16);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "15px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([background, shine, text]);
    container.setSize(width, 34);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", onClick);
    container.on("pointerover", () => background.setFillStyle(0x4b3b68, 0.98));
    container.on("pointerout", () => background.setFillStyle(0x342538, 0.96));

    return container;
  }

  playSound(soundName) {
    if (this.isMuted) return;

    const audioContext = this.sound?.context;
    const tones = SOUND_TONES[soundName];

    if (!audioContext || !tones) return;

    const play = () => this.playToneSequence(audioContext, tones);

    if (audioContext.state === "running") {
      play();
      return;
    }

    audioContext.resume?.().then(() => {
      if (audioContext.state === "running") {
        play();
      }
    }).catch(() => {});
  }

  playToneSequence(audioContext, tones) {
    const now = audioContext.currentTime;

    tones.forEach((tone) => {
      try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = now + tone.delay;
        const endAt = startAt + tone.duration;

        oscillator.type = tone.type ?? "sine";
        oscillator.frequency.setValueAtTime(tone.frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(tone.gain, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startAt);
        oscillator.stop(endAt + 0.02);
      } catch {
        // Browser audio may still be unavailable until a user gesture unlocks it.
      }
    });
  }
}
