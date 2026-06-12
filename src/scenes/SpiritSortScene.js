import Phaser from "phaser";
import { cloneLevel, SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import { applyMove, canMove, isShelfComplete, isSolved, undoMove } from "../systems/SortRules.js";

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

const LAYOUT = {
  shelfWidth: 116,
  shelfHeight: 284,
  shelfGap: 28,
  spiritSize: 52,
  slotGap: 58,
  boardTop: 230,
  selectedTopLift: 12
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
    this.shelfViews = [];

    this.createBackground();
    this.loadLevel(0);
    this.createHud();
    this.redrawBoard();
    this.registerKeyboard();
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

    if (this.winContainer) {
      this.winContainer.destroy(true);
      this.winContainer = null;
    }
  }

  createBackground() {
    const { width, height } = this.scale;

    const sky = this.add.graphics();
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
    mist.fillStyle(0x8b78a8, 0.08);
    mist.fillEllipse(width / 2, height - 98, width * 0.9, 72);
    mist.fillStyle(0xf7d783, 0.06);
    mist.fillEllipse(width / 2, height - 136, width * 0.62, 44);

    this.createFireflies();
  }

  createMoonGlow() {
    this.add.circle(812, 92, 92, 0xf6e8b7, 0.07);
    this.add.circle(812, 92, 62, 0xf6e8b7, 0.12);
    this.add.circle(812, 92, 42, 0xf6e8b7, 0.88);
    this.add.circle(794, 84, 42, COLORS.backgroundTop, 1);

    for (let i = 0; i < 22; i += 1) {
      const x = 42 + ((i * 83) % 860);
      const y = 52 + ((i * 47) % 190);
      const alpha = 0.16 + (i % 4) * 0.05;
      this.add.circle(x, y, 1 + (i % 3), 0xffe9a8, alpha);
    }
  }

  createDistantShrine() {
    const { width, height } = this.scale;
    const scenery = this.add.graphics();

    scenery.fillStyle(0x0f1427, 0.86);
    scenery.fillTriangle(0, height, 170, 438, 360, height);
    scenery.fillTriangle(210, height, 472, 414, 720, height);
    scenery.fillTriangle(580, height, 798, 432, width, height);

    scenery.fillStyle(COLORS.shrineShadow, 0.9);
    scenery.fillRect(448, 346, 16, 134);
    scenery.fillRect(604, 346, 16, 134);
    scenery.fillRect(414, 330, 240, 18);
    scenery.fillRect(438, 308, 192, 14);
    scenery.fillTriangle(398, 330, 534, 272, 670, 330);
    scenery.fillRect(482, 356, 106, 90);
    scenery.fillTriangle(454, 356, 535, 314, 618, 356);
    scenery.fillStyle(0xf7d783, 0.18);
    scenery.fillRect(520, 370, 28, 52);
  }

  createFireflies() {
    for (let i = 0; i < 16; i += 1) {
      const x = 60 + ((i * 61) % 845);
      const y = 182 + ((i * 41) % 280);
      const dot = this.add.circle(x, y, 2 + (i % 2), 0xffe8a0, 0.28);

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
    const hudBand = this.add
      .rectangle(this.scale.width / 2, 56, this.scale.width, 112, 0x17142d, 0.46)
      .setDepth(18);
    hudBand.setStrokeStyle(1, 0xd7aa68, 0.16);

    this.titleText = this.add
      .text(48, 34, "Spirit Shelf Sort", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setDepth(20);
    this.titleText.setShadow(0, 2, "#050511", 4);

    this.levelText = this.add
      .text(50, 77, "", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: COLORS.mutedText
      })
      .setDepth(20);
    this.levelText.setShadow(0, 1, "#050511", 3);

    this.previousButton = this.createButton(558, 42, 74, "Prev", () => this.goToLevel(this.currentLevelIndex - 1));
    this.restartButton = this.createButton(660, 42, 104, "Restart", () => this.restartLevel());
    this.undoButton = this.createButton(768, 42, 84, "Undo", () => this.undoLastMove());
    this.nextButton = this.createButton(870, 42, 74, "Next", () => this.goToLevel(this.currentLevelIndex + 1));

    this.updateHud();
  }

  createButton(x, y, width, label, onClick) {
    const container = this.add.container(x, y).setDepth(25);
    const background = this.add
      .rectangle(0, 0, width, 38, 0x342538, 0.96)
      .setStrokeStyle(2, COLORS.shelfGold, 0.78);
    const shine = this.add.rectangle(0, -13, width - 12, 4, 0xffe2a5, 0.18);
    const leftCap = this.add.rectangle(-width / 2 + 7, 0, 5, 26, COLORS.shelfWoodLight, 0.7);
    const rightCap = this.add.rectangle(width / 2 - 7, 0, 5, 26, COLORS.shelfWoodLight, 0.7);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([background, shine, leftCap, rightCap, text]);
    container.buttonBackground = background;
    container.buttonText = text;
    container.setSize(width, 38);
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
  }

  updateHud() {
    this.levelText.setText(
      `Level ${this.currentLevel.id} of ${SPIRIT_SORT_LEVELS.length}: ${this.currentLevel.name}`
    );

    this.previousButton.setAlpha(this.currentLevelIndex === 0 ? 0.45 : 1);
    this.nextButton.setAlpha(this.currentLevelIndex === SPIRIT_SORT_LEVELS.length - 1 ? 0.45 : 1);
    this.undoButton.setAlpha(this.canUndo() ? 1 : 0.45);
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
    this.clearWinState();
    this.redrawBoard();
    this.playSound("undo");
    this.playUndoFeedback(move.sourceIndex);
    this.updateHud();
  }

  redrawBoard() {
    if (this.boardContainer) {
      this.boardContainer.destroy(true);
    }

    this.boardContainer = this.add.container(0, 0).setDepth(10);
    this.shelfViews = [];

    const positions = this.getShelfPositions();

    this.shelves.forEach((shelf, shelfIndex) => {
      const shelfView = this.createShelfView(shelfIndex, positions[shelfIndex], shelf);
      this.boardContainer.add(shelfView.container);
      this.shelfViews[shelfIndex] = shelfView;
    });
  }

  getShelfPositions() {
    const count = this.shelves.length;
    const totalWidth = count * LAYOUT.shelfWidth + (count - 1) * LAYOUT.shelfGap;
    const startX = (this.scale.width - totalWidth) / 2 + LAYOUT.shelfWidth / 2;

    return this.shelves.map((_, index) => ({
      x: startX + index * (LAYOUT.shelfWidth + LAYOUT.shelfGap),
      y: LAYOUT.boardTop
    }));
  }

  createShelfView(index, position, shelf) {
    const container = this.add.container(position.x, position.y);
    const selected = this.selectedShelfIndex === index;
    const complete = isShelfComplete(shelf, this.capacity);

    const glowColor = selected ? COLORS.selected : COLORS.complete;
    const glowAlpha = selected ? 0.46 : complete ? 0.26 : 0;
    const glow = this.add.rectangle(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth + 28, LAYOUT.shelfHeight + 34, glowColor, glowAlpha);
    glow.setStrokeStyle(selected ? 4 : 2, glowColor, selected || complete ? 0.85 : 0);

    const roof = this.add
      .polygon(0, -20, [-76, 18, 76, 18, 56, -10, -56, -10], COLORS.shelfWoodDark, 1)
      .setStrokeStyle(2, COLORS.shelfGold, 0.7);
    const roofTrim = this.add.rectangle(0, -2, LAYOUT.shelfWidth + 34, 10, COLORS.shelfWoodLight, 1);
    const back = this.add
      .rectangle(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth, LAYOUT.shelfHeight, COLORS.shelfInside, 0.86)
      .setStrokeStyle(4, COLORS.shelfWoodLight, 0.92);
    const innerGlow = this.add.rectangle(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth - 24, LAYOUT.shelfHeight - 28, 0xf7d783, 0.05);

    const leftPost = this.add.rectangle(-LAYOUT.shelfWidth / 2 + 9, LAYOUT.shelfHeight / 2, 14, LAYOUT.shelfHeight + 18, COLORS.shelfWood, 1);
    const rightPost = this.add.rectangle(LAYOUT.shelfWidth / 2 - 9, LAYOUT.shelfHeight / 2, 14, LAYOUT.shelfHeight + 18, COLORS.shelfWood, 1);
    const baseShadow = this.add.rectangle(0, LAYOUT.shelfHeight + 13, LAYOUT.shelfWidth + 34, 10, COLORS.shelfWoodDark, 1);
    const base = this.add.rectangle(0, LAYOUT.shelfHeight + 5, LAYOUT.shelfWidth + 30, 20, COLORS.shelfWoodLight, 1);
    const top = this.add.rectangle(0, 11, LAYOUT.shelfWidth + 10, 8, COLORS.shelfWoodLight, 0.95);

    const planks = [];
    for (let i = 1; i < this.capacity; i += 1) {
      planks.push(this.add.rectangle(0, LAYOUT.shelfHeight - 62 - i * LAYOUT.slotGap, LAYOUT.shelfWidth - 26, 3, COLORS.shelfWoodLight, 0.24));
    }

    const charm = this.add.circle(0, LAYOUT.shelfHeight + 5, 5, COLORS.shelfGold, 0.8);
    const leftKnot = this.add.circle(-LAYOUT.shelfWidth / 2 + 9, 46, 3, COLORS.shelfWoodDark, 0.7);
    const rightKnot = this.add.circle(LAYOUT.shelfWidth / 2 - 9, 116, 3, COLORS.shelfWoodDark, 0.7);

    const zone = this.add.zone(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth + 26, LAYOUT.shelfHeight + 36);
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
        local.y - (isSelectedTop ? LAYOUT.selectedTopLift : 0),
        spiritType
      );

      if (isSelectedTop) {
        spirit.setScale(1.06);
      }

      container.add(spirit);
    });

    if (complete) {
      for (let i = 0; i < 4; i += 1) {
        const sparkleX = -36 + i * 24;
        const sparkleY = 20 + (i % 2) * 18;
        container.add(this.add.circle(sparkleX, sparkleY, 3, COLORS.complete, 0.58));
      }

      const restoredText = this.add
        .text(0, LAYOUT.shelfHeight + 27, "restored", {
          fontFamily: "Arial",
          fontSize: "13px",
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
    const config = SPIRIT_TYPES[spiritType] ?? SPIRIT_TYPES.fire;
    const container = this.add.container(x, y);

    const glow = this.add.circle(0, 0, LAYOUT.spiritSize / 2 + 10, config.glow, 0.2);
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
    const movingSpirit = this.shelves[sourceIndex][this.shelves[sourceIndex].length - 1];
    const start = this.getSpiritWorldPosition(sourceIndex, this.shelves[sourceIndex].length - 1);
    const end = this.getSpiritWorldPosition(targetIndex, this.shelves[targetIndex].length);

    this.isAnimating = true;
    this.selectedShelfIndex = null;

    const targetWasComplete = isShelfComplete(this.shelves[targetIndex], this.capacity);

    applyMove(this.shelves, sourceIndex, targetIndex, this.capacity);
    this.moveHistory.push({ sourceIndex, targetIndex, spirit: movingSpirit });
    this.updateHud();
    this.hiddenSpirit = {
      shelfIndex: targetIndex,
      stackIndex: this.shelves[targetIndex].length - 1
    };
    this.redrawBoard();

    const movingVisual = this.createSpiritVisual(start.x, start.y, movingSpirit).setDepth(40);
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - 84
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
    return {
      x: 0,
      y: LAYOUT.shelfHeight - 38 - stackIndex * LAYOUT.slotGap
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

    this.tweens.add({
      targets: view.container,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 90,
      yoyo: true,
      ease: "Sine.easeOut"
    });

    this.createSparkles(view.position.x, view.position.y + 58, completedNow ? 12 : 6);

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

  playInvalidMoveFeedback(shelfIndex) {
    const view = this.shelfViews[shelfIndex];
    if (!view) return;

    const flash = this.add
      .rectangle(view.position.x, view.position.y + LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth + 34, LAYOUT.shelfHeight + 40, COLORS.invalid, 0.34)
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

    this.winContainer = this.add.container(this.scale.width / 2, 154).setDepth(50);

    const panel = this.add
      .rectangle(0, 0, 500, 132, 0x211c37, 0.92)
      .setStrokeStyle(3, COLORS.complete, 0.9);
    const title = this.add
      .text(0, -38, "Shrine restored!", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const isLastLevel = this.currentLevelIndex === SPIRIT_SORT_LEVELS.length - 1;
    const detail = this.add
      .text(0, -2, isLastLevel ? "Final prototype level restored. Undo is still available." : "Next level is ready. Undo is still available.", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#bfeadf"
      })
      .setOrigin(0.5);
    const restartButton = this.createWinButton(-74, 38, 124, "Restart", () => this.restartLevel());
    const nextButton = this.createWinButton(78, 38, 132, "Next Level", () => this.goToLevel(this.currentLevelIndex + 1));
    nextButton.setAlpha(isLastLevel ? 0.45 : 1);

    this.winContainer.add([panel, title, detail, restartButton, nextButton]);
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
