import Phaser from "phaser";
import { cloneLevel, SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import {
  getLevelCompletion,
  getContinueLevelId,
  isLevelUnlocked,
  loadProgress,
  markLevelComplete,
  markLevelStarted,
  setBlessedShelfTutorialSeen,
  setMuted
} from "../systems/ProgressSave.js";
import { getSpiritTextureKey } from "../systems/SpiritAssetLoader.js";
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
  blessed: 0x8feeff,
  blessedGold: 0xffe6a5,
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
  hudHeight: 78
};

const MOBILE_LAYOUT = {
  hudHeight: 84,
  buttonHeight: 32,
  buttonGap: 6,
  minShelfWidth: 68,
  maxShelfWidth: 82,
  minShelfHeight: 176,
  maxShelfHeight: 220,
  rowGapMin: 16,
  rowGapMax: 26,
  topClearance: 38,
  bottomMargin: 18
};

const SPIRIT_VISUALS = {
  imageFitRatio: 1.08,
  rimScale: 1.06,
  selectedScale: 1.06,
  idleFloat: 1.2,
  selectedIdleFloat: 2.4
};

const SPIRIT_PERSONALITIES = {
  fire: { float: 1.6, scalePulse: 1.018, rotation: 1.2, duration: 980, sparkle: 0xffc27a },
  leaf: { float: 1.1, scalePulse: 1.01, rotation: 1.8, duration: 1700, sparkle: 0xbdf7a7 },
  moon: { float: 1.8, scalePulse: 1.008, rotation: 0.6, duration: 2100, sparkle: 0xcdd4ff },
  cloud: { float: 1.4, scalePulse: 1.014, rotation: 0.8, duration: 1550, sparkle: 0xe9f8ff },
  star: { float: 1.2, scalePulse: 1.02, rotation: 1.4, duration: 1150, sparkle: 0xffef9b }
};

export default class SpiritSortScene extends Phaser.Scene {
  constructor() {
    super("SpiritSortScene");
  }

  create(data = {}) {
    this.isSceneAlive = true;
    this.progress = loadProgress(SPIRIT_SORT_LEVELS);
    const requestedLevelId = data.levelId ?? this.progress.currentLevelId;
    const startLevelId = isLevelUnlocked(this.progress, requestedLevelId)
      ? requestedLevelId
      : getContinueLevelId(this.progress, SPIRIT_SORT_LEVELS);
    this.currentLevelIndex = this.getLevelIndexFromId(startLevelId);
    this.selectedShelfIndex = null;
    this.isAnimating = false;
    this.hiddenSpirit = null;
    this.hasWon = false;
    this.moveHistory = [];
    this.moveCount = 0;
    this.isMuted = this.progress.muted;
    this.shelfViews = [];
    this.boardLayout = null;
    this.hintEffects = [];
    this.boardTweenTargets = [];
    this.tutorialContainer = null;

    this.createBackground();
    this.loadLevel(this.currentLevelIndex);
    this.createHud();
    this.redrawBoard();
    this.maybeShowBlessedShelfTutorial();
    this.registerKeyboard();
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.isSceneAlive = false;
      this.clearBoardTweens();
      this.clearHintFeedback();
      this.destroyBlessedShelfTutorial();
      this.scale.off("resize", this.handleResize, this);
    });
  }

  loadLevel(levelIndex) {
    const nextIndex = Phaser.Math.Clamp(levelIndex, 0, SPIRIT_SORT_LEVELS.length - 1);
    const level = cloneLevel(SPIRIT_SORT_LEVELS[nextIndex]);

    this.currentLevelIndex = nextIndex;
    this.currentLevel = level;
    this.progress = markLevelStarted(this.progress, level.id, SPIRIT_SORT_LEVELS);
    this.isMuted = this.progress.muted;
    this.capacity = level.capacity ?? 4;
    this.shelves = level.shelves;
    this.blessedShelves = [...(level.blessedShelves ?? [])];
    this.blessedShelfSet = new Set(this.blessedShelves);
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

    this.destroyBlessedShelfTutorial();
  }

  getLevelIndexFromId(levelId) {
    const levelIndex = SPIRIT_SORT_LEVELS.findIndex((level) => level.id === levelId);
    return levelIndex >= 0 ? levelIndex : 0;
  }

  getSpiritTextureKey(spiritType) {
    return getSpiritTextureKey(spiritType);
  }

  getMoveOptions() {
    return { blessedShelves: this.blessedShelves ?? [] };
  }

  isCurrentShelfBlessed(shelfIndex) {
    return this.blessedShelfSet?.has(shelfIndex) ?? false;
  }

  handleResize() {
    if (this.isAnimating) return;

    const tutorialWasOpen = Boolean(this.tutorialContainer);
    this.createBackground();
    this.createHud();
    this.redrawBoard();

    if (this.hasWon) {
      this.showWinMessage();
    }

    if (tutorialWasOpen) {
      this.showBlessedShelfTutorial();
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
    this.titleText = null;

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

    this.moveText.setVisible(!hud.moves.hidden);

    this.restartButton = this.createButton(hud.buttons.restart.x, hud.buttons.restart.y, hud.buttons.restart.width, hud.labels.restart, () => this.restartLevel());
    this.undoButton = this.createButton(hud.buttons.undo.x, hud.buttons.undo.y, hud.buttons.undo.width, hud.labels.undo, () => this.undoLastMove());
    this.hintButton = this.createButton(hud.buttons.hint.x, hud.buttons.hint.y, hud.buttons.hint.width, hud.labels.hint, () => this.showHint());
    this.muteButton = this.createButton(hud.buttons.mute.x, hud.buttons.mute.y, hud.buttons.mute.width, hud.labels.sound, () => this.toggleMute());
    this.levelsButton = this.createButton(hud.buttons.levels.x, hud.buttons.levels.y, hud.buttons.levels.width, hud.labels.levels, () => this.openLevelSelect());
    this.hudContainer.add([ this.restartButton, this.undoButton, this.hintButton, this.muteButton, this.levelsButton]);

    this.updateHud();
  }

  getHudLayout() {
    const width = this.scale.width;
    const isNarrow = width < 700;

    if (!isNarrow) {
      const buttonSpecs = [
        ["restart", 88],
        ["undo", 70],
        ["hint", 70],
        ["mute", 86],
        ["levels", 82],
      ];
      const buttons = this.layoutButtonRow(width - 24, 42, buttonSpecs, 8);

      return {
        bandHeight: BASE_LAYOUT.hudHeight,
        compactInfo: true,
        includeLevelName: width >= 860,
        level: { x: 50, y: 42, fontSize: 17, originX: 0, wrapWidth: Math.max(180, width - 585) },
        moves: { x: 50, y: 0, fontSize: 1, originX: 0, hidden: true },
        buttonHeight: 38,
        buttonFontSize: 16,
        labels: {
          restart: "Restart",
          undo: "Undo",
          hint: "Hint",
          sound: "Sound",
          muted: "Muted",
          levels: "Levels",
        },
        buttons
      };
    }

    const veryNarrow = width < 340;
    const gap = veryNarrow ? 3 : 4;
    const buttonSpecs = veryNarrow
      ? [
          ["restart", 42],
          ["undo", 36],
          ["hint", 36],
          ["mute", 40],
          ["levels", 42],
        ]
      : [
          ["restart", 52],
          ["undo", 42],
          ["hint", 40],
          ["mute", 48],
          ["levels", 48],
        ];
    const buttons = this.layoutButtonRow(width / 2, veryNarrow ? 60 : 64, buttonSpecs, gap, true);

    return {
      bandHeight: veryNarrow ? 80 : MOBILE_LAYOUT.hudHeight,
      compactInfo: true,
      includeLevelName: false,
      level: { x: width / 2, y: veryNarrow ? 24 : 26, fontSize: veryNarrow ? 12 : 13, originX: 0.5, wrapWidth: width - 20 },
      moves: { x: width / 2, y: 0, fontSize: 1, originX: 0.5, hidden: true },
      buttonHeight: veryNarrow ? 30 : MOBILE_LAYOUT.buttonHeight,
      buttonFontSize: veryNarrow ? 11 : 12,
      labels: {
        restart: "Reset",
        undo: "Undo",
        hint: "Hint",
        sound: "Sound",
        muted: "Mute",
        levels: veryNarrow ? "Map" : "Levels",
      },
      buttons
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
    this.input.keyboard.on("keydown-U", () => this.undoLastMove());
    this.input.keyboard.on("keydown-BACKSPACE", () => this.undoLastMove());
    this.input.keyboard.on("keydown-H", () => this.showHint());
    this.input.keyboard.on("keydown-M", () => this.toggleMute());
    this.input.keyboard.on("keydown-L", () => this.openLevelSelect());
  }

  updateHud() {
    const hud = this.getHudLayout();

    if (hud.compactInfo) {
      const levelName = hud.includeLevelName ? `: ${this.currentLevel.name}` : "";
      this.levelText.setText(`Level ${this.currentLevelIndex + 1} / ${SPIRIT_SORT_LEVELS.length}${levelName} | Moves: ${this.moveCount}`);
      this.moveText.setText("");
      this.moveText.setVisible(false);
    } else {
      this.levelText.setText(
        `Level ${this.currentLevelIndex + 1} / ${SPIRIT_SORT_LEVELS.length}: ${this.currentLevel.name}`
      );
      this.moveText.setText(`Moves: ${this.moveCount}`);
      this.moveText.setVisible(true);
    }

    const nextLevel = SPIRIT_SORT_LEVELS[this.currentLevelIndex + 1];
    this.undoButton.setAlpha(this.canUndo() ? 1 : 0.45);
    this.hintButton.setAlpha(this.canUseHint() ? 1 : 0.45);
    this.muteButton.buttonText.setText(this.isMuted ? hud.labels.muted : hud.labels.sound);
  }

  restartLevel() {
    if (this.isAnimating) return;

    this.playSound("button");
    this.loadLevel(this.currentLevelIndex);
    this.updateHud();
    this.redrawBoard();
    this.maybeShowBlessedShelfTutorial();
  }

  goToLevel(levelIndex) {
    if (this.isAnimating) return;

    const nextIndex = Phaser.Math.Clamp(levelIndex, 0, SPIRIT_SORT_LEVELS.length - 1);
    if (nextIndex === this.currentLevelIndex) return;
    const nextLevel = SPIRIT_SORT_LEVELS[nextIndex];
    if (!isLevelUnlocked(this.progress, nextLevel.id)) {
      this.playSound("invalid");
      this.playHudPulse();
      return;
    }

    this.playSound("button");
    this.loadLevel(nextIndex);
    this.updateHud();
    this.redrawBoard();
    this.maybeShowBlessedShelfTutorial();
  }

  openLevelSelect() {
    if (this.isAnimating) return;

    this.playSound("button");
    this.scene.start("LevelSelectScene");
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

    const hint = findHintMove(this.shelves, this.capacity, this.getMoveOptions());

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
    this.progress = setMuted(this.progress, this.isMuted, SPIRIT_SORT_LEVELS);
    this.updateHud();

    if (!this.isMuted) {
      this.playSound("button");
    }
  }

  redrawBoard() {
    this.clearHintFeedback();
    this.clearBoardTweens();

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
    const isNarrow = width < 700;

    if (isNarrow) {
      return this.getMobileBoardLayout(width, height, shelfCount);
    }

    const margin = Phaser.Math.Clamp(width * 0.045, 12, 44);
    const columns = shelfCount;
    const rows = 1;
    const rowPattern = [shelfCount];
    const gap = BASE_LAYOUT.shelfGap;
    const rowGap = 0;
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
      154,
      BASE_LAYOUT.shelfHeight
    );
    const scale = shelfHeight / BASE_LAYOUT.shelfHeight;
    const spiritSize = Phaser.Math.Clamp(BASE_LAYOUT.spiritSize * scale, 34, BASE_LAYOUT.spiritSize);
    const slotGap = Math.max(spiritSize + 5, (shelfHeight - 58) / Math.max(1, this.capacity - 1));

    return {
      isMobile: false,
      columns,
      rows,
      rowPattern,
      gap,
      rowGap,
      rowSpacingExtra: 28,
      shelfWidth,
      shelfHeight,
      spiritSize,
      slotGap,
      spiritBottomOffset: 38,
      boardTop,
      selectedTopLift: Phaser.Math.Clamp(BASE_LAYOUT.selectedTopLift * scale, 7, BASE_LAYOUT.selectedTopLift)
    };
  }

  getMobileBoardLayout(width, height, shelfCount) {
    const rowPattern = this.getMobileShelfRowPattern(shelfCount, width);
    const rows = rowPattern.length;
    const columns = Math.max(...rowPattern);
    const margin = Phaser.Math.Clamp(width * 0.035, 8, 14);
    const gap = Phaser.Math.Clamp(width * 0.025, 8, 12);
    const rowGap = rows > 1 ? Phaser.Math.Clamp(height * 0.032, MOBILE_LAYOUT.rowGapMin, MOBILE_LAYOUT.rowGapMax) : 0;
    const hudHeight = this.getHudLayout().bandHeight;
    const boardTop = hudHeight + MOBILE_LAYOUT.topClearance;
    const availableWidth = Math.max(280, width - margin * 2);
    const rowSpacingExtra = 18;
    const availableHeight = Math.max(
      MOBILE_LAYOUT.minShelfHeight,
      height - boardTop - MOBILE_LAYOUT.bottomMargin
    );
    const shelfWidth = Phaser.Math.Clamp(
      (availableWidth - gap * (columns - 1)) / columns,
      MOBILE_LAYOUT.minShelfWidth,
      MOBILE_LAYOUT.maxShelfWidth
    );
    const heightPerRow = (availableHeight - (rows - 1) * (rowGap + rowSpacingExtra)) / rows;
    const preferredShelfHeight = rows === 1 ? height * 0.34 : heightPerRow;
    const shelfHeight = Phaser.Math.Clamp(
      Math.min(preferredShelfHeight, heightPerRow),
      MOBILE_LAYOUT.minShelfHeight,
      MOBILE_LAYOUT.maxShelfHeight
    );
    const spiritBottomOffset = Phaser.Math.Clamp(shelfHeight * 0.15, 26, 34);
    const slotGap = Math.max(30, (shelfHeight - spiritBottomOffset - 18) / Math.max(1, this.capacity - 1));
    const spiritSize = Phaser.Math.Clamp(slotGap * 0.72, 30, 40);

    return {
      isMobile: true,
      columns,
      rows,
      rowPattern,
      gap,
      rowGap,
      rowSpacingExtra,
      shelfWidth,
      shelfHeight,
      spiritSize,
      slotGap,
      spiritBottomOffset,
      boardTop,
      selectedTopLift: Phaser.Math.Clamp(spiritSize * 0.18, 5, 8)
    };
  }

  getMobileShelfRowPattern(shelfCount, width) {
    const availableWidth = width - Phaser.Math.Clamp(width * 0.035, 8, 14) * 2;
    const fourShelfWidth = MOBILE_LAYOUT.minShelfWidth * 4 + 8 * 3;

    if (shelfCount <= 3) return [shelfCount];
    if (shelfCount === 4) return availableWidth >= fourShelfWidth ? [4] : [2, 2];
    if (shelfCount === 5) return [3, 2];
    if (shelfCount === 6) return [3, 3];
    if (shelfCount === 7) return [4, 3];

    return [4, shelfCount - 4];
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
    let shelfIndex = 0;

    for (let row = 0; row < layout.rowPattern.length; row += 1) {
      const rowCount = layout.rowPattern[row];
      const totalWidth = rowCount * layout.shelfWidth + (rowCount - 1) * layout.gap;
      const startX = (this.scale.width - totalWidth) / 2 + layout.shelfWidth / 2;
      const y = layout.boardTop + row * (layout.shelfHeight + layout.rowGap + layout.rowSpacingExtra);

      for (let column = 0; column < rowCount; column += 1) {
        positions[shelfIndex] = {
          x: startX + column * (layout.shelfWidth + layout.gap),
          y
        };
        shelfIndex += 1;
      }
    }

    return positions;
  }

  createShelfView(index, position, shelf) {
    const layout = this.getCurrentLayout();
    const container = this.add.container(position.x, position.y);
    const spiritViews = [];
    const selected = this.selectedShelfIndex === index;
    const complete = isShelfComplete(shelf, this.capacity);
    const blessed = this.isCurrentShelfBlessed(index);

    const glowColor = selected ? COLORS.selected : COLORS.complete;
    const glowAlpha = selected ? 0.46 : complete ? 0.26 : 0;
    const glowPadding = layout.isMobile ? 18 : 28;
    const glow = this.add.rectangle(0, layout.shelfHeight / 2, layout.shelfWidth + glowPadding, layout.shelfHeight + (layout.isMobile ? 24 : 34), glowColor, glowAlpha);
    glow.setStrokeStyle(selected ? 4 : 2, glowColor, selected || complete ? 0.85 : 0);
    const blessedAura = blessed
      ? this.add.rectangle(0, layout.shelfHeight / 2, layout.shelfWidth + glowPadding + 18, layout.shelfHeight + (layout.isMobile ? 42 : 58), COLORS.blessed, 0.18)
        .setStrokeStyle(layout.isMobile ? 3 : 4, COLORS.blessedGold, 0.72)
      : null;
    const blessedGoldAura = blessed
      ? this.add.rectangle(0, layout.shelfHeight / 2, layout.shelfWidth + glowPadding + 30, layout.shelfHeight + (layout.isMobile ? 56 : 76), COLORS.blessedGold, 0.07)
        .setStrokeStyle(2, COLORS.blessed, 0.42)
      : null;
    const blessedPulse = blessed
      ? this.add.rectangle(0, layout.shelfHeight / 2, layout.shelfWidth + glowPadding + 10, layout.shelfHeight + (layout.isMobile ? 34 : 48), COLORS.blessed, 0.02)
        .setStrokeStyle(layout.isMobile ? 3 : 4, COLORS.blessed, 0.82)
      : null;

    const roofHalf = layout.shelfWidth / 2 + (layout.isMobile ? 8 : 18);
    const roofInset = Math.max(24, layout.shelfWidth / 2 - 2);
    const roofY = layout.isMobile ? -8 : -20;
    const roofPoints = layout.isMobile
      ? [-roofHalf, 12, roofHalf, 12, roofInset, -8, -roofInset, -8]
      : [-roofHalf, 18, roofHalf, 18, roofInset, -10, -roofInset, -10];
    const roof = this.add
      .polygon(0, roofY, roofPoints, COLORS.shelfWoodDark, 1)
      .setStrokeStyle(2, COLORS.shelfGold, 0.7);
    const roofTrim = this.add.rectangle(0, layout.isMobile ? 3 : -2, layout.shelfWidth + (layout.isMobile ? 14 : 34), layout.isMobile ? 6 : 10, COLORS.shelfWoodLight, 1);
    const back = this.add
      .rectangle(0, layout.shelfHeight / 2, layout.shelfWidth, layout.shelfHeight, COLORS.shelfInside, 0.86)
      .setStrokeStyle(layout.isMobile ? 3 : 4, COLORS.shelfWoodLight, 0.92);
    const innerGlow = this.add.rectangle(
      0,
      layout.shelfHeight / 2,
      layout.shelfWidth - (layout.isMobile ? 16 : 24),
      layout.shelfHeight - (layout.isMobile ? 20 : 28),
      blessed ? COLORS.blessed : 0xf7d783,
      blessed ? 0.16 : 0.05
    );

    const postWidth = layout.isMobile ? 10 : 14;
    const postInset = layout.isMobile ? 7 : 9;
    const leftPost = this.add.rectangle(-layout.shelfWidth / 2 + postInset, layout.shelfHeight / 2, postWidth, layout.shelfHeight + (layout.isMobile ? 10 : 18), COLORS.shelfWood, 1);
    const rightPost = this.add.rectangle(layout.shelfWidth / 2 - postInset, layout.shelfHeight / 2, postWidth, layout.shelfHeight + (layout.isMobile ? 10 : 18), COLORS.shelfWood, 1);
    const baseShadow = this.add.rectangle(0, layout.shelfHeight + (layout.isMobile ? 8 : 13), layout.shelfWidth + (layout.isMobile ? 22 : 34), layout.isMobile ? 6 : 10, COLORS.shelfWoodDark, 1);
    const base = this.add.rectangle(0, layout.shelfHeight + (layout.isMobile ? 2 : 5), layout.shelfWidth + (layout.isMobile ? 20 : 30), layout.isMobile ? 14 : 20, COLORS.shelfWoodLight, 1);
    const top = this.add.rectangle(0, layout.isMobile ? 8 : 11, layout.shelfWidth + (layout.isMobile ? 8 : 10), layout.isMobile ? 6 : 8, COLORS.shelfWoodLight, 0.95);

    const planks = [];
    for (let i = 1; i < this.capacity; i += 1) {
      const plankY = layout.isMobile
        ? layout.shelfHeight - layout.spiritBottomOffset - (i - 0.5) * layout.slotGap
        : layout.shelfHeight - 62 - i * layout.slotGap;
      planks.push(this.add.rectangle(0, plankY, layout.shelfWidth - (layout.isMobile ? 18 : 26), layout.isMobile ? 2 : 3, COLORS.shelfWoodLight, layout.isMobile ? 0.2 : 0.24));
    }

    const charm = this.add.circle(0, layout.shelfHeight + (layout.isMobile ? 2 : 5), layout.isMobile ? 4 : 5, COLORS.shelfGold, 0.8);
    const blessedMark = blessed
      ? this.add.star(layout.shelfWidth / 2 - (layout.isMobile ? 17 : 22), layout.isMobile ? -8 : -22, 5, layout.isMobile ? 5 : 6, layout.isMobile ? 12 : 15, COLORS.blessedGold, 0.96)
      : null;
    const blessedEmblem = blessed ? this.createBlessedShelfEmblem(layout) : null;
    const blessedMoon = blessed ? this.createBlessedShelfMoonMarker(layout) : null;
    const leftKnot = this.add.circle(-layout.shelfWidth / 2 + postInset, layout.isMobile ? 38 : 46, layout.isMobile ? 2.5 : 3, COLORS.shelfWoodDark, 0.7);
    const rightKnot = this.add.circle(layout.shelfWidth / 2 - postInset, Math.min(layout.isMobile ? 96 : 116, layout.shelfHeight - 36), layout.isMobile ? 2.5 : 3, COLORS.shelfWoodDark, 0.7);

    const zone = this.add.zone(0, layout.shelfHeight / 2, Math.max(72, layout.shelfWidth + (layout.isMobile ? 24 : 32)), layout.shelfHeight + (layout.isMobile ? 36 : 46));
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.handleShelfTap(index));

    container.add([
      blessedGoldAura,
      blessedAura,
      blessedPulse,
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
      blessedMark,
      blessedEmblem,
      blessedMoon,
      leftKnot,
      rightKnot
    ].filter(Boolean));

    if (blessed) {
      this.applyBlessedShelfAnimation({
        aura: blessedAura,
        goldAura: blessedGoldAura,
        pulse: blessedPulse,
        mark: blessedMark,
        emblem: blessedEmblem,
        moon: blessedMoon
      });
    }

    if (selected) {
      const selectorY = layout.isMobile ? -23 : -32;
      const selectorHalo = this.add.circle(0, selectorY, layout.isMobile ? 14 : 18, COLORS.selected, 0.3);
      const selectorArrow = this.add.triangle(0, selectorY + 3, 0, 11, -11, -8, 11, -8, COLORS.selected, 0.92);
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
        spirit.setScale(spirit.scaleX * SPIRIT_VISUALS.selectedScale, spirit.scaleY * SPIRIT_VISUALS.selectedScale);
      }

      this.applySpiritIdleAnimation(spirit, index, stackIndex, isSelectedTop, spiritType);
      spiritViews[stackIndex] = spirit;
      container.add(spirit);
    });

    if (complete) {
      const completeSparkles = [];

      for (let i = 0; i < 4; i += 1) {
        const sparkleX = -layout.shelfWidth * 0.32 + i * (layout.shelfWidth * 0.21);
        const sparkleY = 20 + (i % 2) * 16;
        const sparkle = this.add.circle(sparkleX, sparkleY, 3, COLORS.complete, 0.58);
        completeSparkles.push(sparkle);
        container.add(sparkle);
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
      this.applyCompletedShelfAnimation(glow, completeSparkles);
    }

    container.add(zone);

    return { container, position, spiritViews };
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
    const textureKey = this.getSpiritTextureKey(spiritType);

    if (this.textures.exists(textureKey)) {
      return this.createSpiritImageVisual(x, y, textureKey, config, layout);
    }

    const container = this.add.container(x, y);
    const spiritScale = layout.spiritSize / BASE_LAYOUT.spiritSize;

    const glowParts = this.createSpiritGlowParts(config, BASE_LAYOUT.spiritSize);
    const bodyParts = this.createSpiritBodyParts(spiritType, config);
    const warmLight = this.createSpiritWarmLight(BASE_LAYOUT.spiritSize);

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

    container.add([...glowParts, ...bodyParts, warmLight, eyeLeft, eyeRight, label]);
    container.setScale(spiritScale);
    return container;
  }

  createSpiritImageVisual(x, y, textureKey, config, layout) {
    const container = this.add.container(x, y);
    const frame = this.textures.getFrame(textureKey);
    const textureWidth = Math.max(1, frame?.width ?? frame?.realWidth ?? 128);
    const textureHeight = Math.max(1, frame?.height ?? frame?.realHeight ?? 128);
    const fitScale = (layout.spiritSize * SPIRIT_VISUALS.imageFitRatio) / Math.max(textureWidth, textureHeight);
    const glowParts = this.createSpiritGlowParts(config, layout.spiritSize);
    const rimGlow = this.add.image(0, 0, textureKey);
    const image = this.add.image(0, 0, textureKey);
    const warmOverlay = this.add.image(0, 0, textureKey);
    const warmLight = this.createSpiritWarmLight(layout.spiritSize);

    rimGlow
      .setScale(fitScale * SPIRIT_VISUALS.rimScale)
      .setTint(config.glow)
      .setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD);
    image.setScale(fitScale);
    warmOverlay
      .setScale(fitScale)
      .setTint(0xffe2a5)
      .setAlpha(0.1)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([...glowParts, rimGlow, image, warmOverlay, warmLight]);
    return container;
  }

  createSpiritGlowParts(config, size) {
    const outerGlow = this.add.circle(0, -size * 0.03, size * 0.64, config.glow, 0.14);
    const innerGlow = this.add.circle(0, -size * 0.04, size * 0.48, config.color, 0.08);
    const groundGlow = this.add.ellipse(0, size * 0.43, size * 0.78, size * 0.18, config.glow, 0.1);
    const shadow = this.add.ellipse(0, size * 0.47, size * 0.76, size * 0.16, 0x0c0b18, 0.2);

    return [outerGlow, innerGlow, groundGlow, shadow];
  }

  createSpiritWarmLight(size) {
    return this.add.ellipse(-size * 0.14, -size * 0.28, size * 0.62, size * 0.3, 0xffe8b2, 0.1);
  }

  createBlessedShelfEmblem(layout) {
    const emblem = this.add.container(0, layout.isMobile ? 8 : -1);
    const badgeRadius = layout.isMobile ? 13 : 17;
    const badge = this.add.circle(0, 0, badgeRadius, 0x241b34, 0.94).setStrokeStyle(2, COLORS.blessedGold, 0.92);
    const halo = this.add.circle(0, 0, badgeRadius + 5, COLORS.blessed, 0.2);
    const rune = this.add.star(0, 0, 6, layout.isMobile ? 3.5 : 4.5, layout.isMobile ? 8 : 10, COLORS.blessedGold, 0.98);
    const core = this.add.circle(0, 0, layout.isMobile ? 2.5 : 3, COLORS.blessed, 0.9);

    emblem.add([halo, badge, rune, core]);
    return emblem;
  }

  createBlessedShelfMoonMarker(layout) {
    const marker = this.add.container(-layout.shelfWidth / 2 + (layout.isMobile ? 15 : 20), layout.isMobile ? -14 : -30);
    const glow = this.add.circle(0, 0, layout.isMobile ? 11 : 14, COLORS.blessed, 0.22);
    const moon = this.add.circle(0, 0, layout.isMobile ? 7 : 9, COLORS.blessedGold, 0.92);
    const cutout = this.add.circle(layout.isMobile ? 3 : 4, -1, layout.isMobile ? 7 : 9, COLORS.backgroundTop, 1);
    const spark = this.add.star(layout.isMobile ? 11 : 15, layout.isMobile ? -7 : -9, 4, 2, layout.isMobile ? 4 : 5, COLORS.blessed, 0.92);

    marker.add([glow, moon, cutout, spark]);
    return marker;
  }

  applySpiritIdleAnimation(spirit, shelfIndex, stackIndex, isSelectedTop = false, spiritType = "fire") {
    if (!spirit) return;

    const personality = SPIRIT_PERSONALITIES[spiritType] ?? SPIRIT_PERSONALITIES.fire;
    const baseY = spirit.y;
    const baseScaleX = spirit.scaleX;
    const baseScaleY = spirit.scaleY;
    const floatAmount = isSelectedTop ? SPIRIT_VISUALS.selectedIdleFloat + personality.float * 0.35 : personality.float;
    const scalePulse = isSelectedTop ? 1.028 : personality.scalePulse;
    const duration = personality.duration + ((shelfIndex * 97 + stackIndex * 53) % 280);

    this.tweens.add({
      targets: spirit,
      y: baseY - floatAmount,
      scaleX: baseScaleX * scalePulse,
      scaleY: baseScaleY * (isSelectedTop ? 1.026 : personality.scalePulse),
      angle: (stackIndex % 2 === 0 ? personality.rotation : -personality.rotation) * (isSelectedTop ? 1.35 : 1),
      duration,
      delay: (shelfIndex * 80 + stackIndex * 120) % 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.trackBoardTweenTargets(spirit);
  }

  applyCompletedShelfAnimation(glow, sparkles) {
    this.tweens.add({
      targets: glow,
      alpha: Math.min(0.38, glow.alpha + 0.1),
      scaleX: 1.025,
      scaleY: 1.015,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.trackBoardTweenTargets(glow);

    sparkles.forEach((sparkle, index) => {
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - 5,
        alpha: 0.18,
        scale: 1.35,
        duration: 900 + index * 120,
        delay: index * 140,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(sparkle);
    });
  }

  trackBoardTweenTargets(...targets) {
    this.boardTweenTargets.push(...targets.filter(Boolean));
  }

  clearBoardTweens() {
    if (!this.boardTweenTargets?.length) return;

    this.tweens.killTweensOf(this.boardTweenTargets);
    this.boardTweenTargets = [];
  }

  applyBlessedShelfAnimation({ aura, goldAura, pulse, mark, emblem, moon }) {
    if (aura) {
      this.tweens.add({
        targets: aura,
        alpha: 0.28,
        scaleX: 1.026,
        scaleY: 1.018,
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(aura);
    }

    if (goldAura) {
      this.tweens.add({
        targets: goldAura,
        alpha: 0.14,
        scaleX: 1.018,
        scaleY: 1.012,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(goldAura);
    }

    if (pulse) {
      this.tweens.add({
        targets: pulse,
        alpha: 0.26,
        scaleX: 1.045,
        scaleY: 1.026,
        duration: 1450,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(pulse);
    }

    if (mark) {
      this.tweens.add({
        targets: mark,
        alpha: 0.7,
        angle: 10,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 1900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(mark);
    }

    if (emblem) {
      this.tweens.add({
        targets: emblem,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(emblem);
    }

    if (moon) {
      this.tweens.add({
        targets: moon,
        y: moon.y - 4,
        angle: -8,
        duration: 2100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.trackBoardTweenTargets(moon);
    }
  }

  maybeShowBlessedShelfTutorial() {
    if (this.currentLevel?.id !== 25) return;
    if (!this.blessedShelves?.length) return;
    if (this.progress.seenBlessedShelfTutorial) return;

    this.showBlessedShelfTutorial();
  }

  showBlessedShelfTutorial() {
    this.destroyBlessedShelfTutorial();

    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(width - 28, width < 420 ? 312 : 390);
    const panelHeight = width < 420 ? 174 : 184;
    const panelY = Math.min(height - panelHeight / 2 - 18, this.getHudLayout().bandHeight + panelHeight / 2 + 20);
    const titleSize = width < 420 ? 20 : 24;
    const bodySize = width < 420 ? 13 : 15;

    this.tutorialContainer = this.add.container(0, 0).setDepth(70);
    const scrim = this.add.rectangle(width / 2, height / 2, width, height, 0x070711, 0.42);
    scrim.setInteractive();

    const panel = this.add
      .rectangle(width / 2, panelY, panelWidth, panelHeight, 0x211c37, 0.96)
      .setStrokeStyle(3, COLORS.blessedGold, 0.86);
    const title = this.add
      .text(width / 2, panelY - panelHeight * 0.32, "Blessed Shelf", {
        fontFamily: "Arial",
        fontSize: `${titleSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    title.setShadow(0, 2, "#050511", 4);

    const detail = this.add
      .text(width / 2, panelY - 12, "Look for the glowing star shelf.\nIt can receive any spirit type.", {
        fontFamily: "Arial",
        fontSize: `${bodySize}px`,
        color: COLORS.mutedText,
        align: "center",
        lineSpacing: 5,
        wordWrap: { width: panelWidth - 34, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    detail.setShadow(0, 1, "#050511", 3);

    const buttonWidth = width < 420 ? 108 : 124;
    const buttonHeight = 34;
    const buttonY = panelY + panelHeight * 0.34;
    const button = this.add.container(width / 2, buttonY);
    const buttonBackground = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0x342538, 0.96)
      .setStrokeStyle(2, COLORS.blessedGold, 0.82);
    const buttonText = this.add
      .text(0, 0, "Got it", {
        fontFamily: "Arial",
        fontSize: `${width < 420 ? 14 : 15}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    button.add([buttonBackground, buttonText]);
    button.setSize(buttonWidth, buttonHeight);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.dismissBlessedShelfTutorial());
    button.on("pointerover", () => buttonBackground.setFillStyle(0x4b3b68, 0.98));
    button.on("pointerout", () => buttonBackground.setFillStyle(0x342538, 0.96));

    this.tutorialContainer.add([scrim, panel, title, detail, button]);
  }

  dismissBlessedShelfTutorial() {
    this.progress = setBlessedShelfTutorialSeen(this.progress, true, SPIRIT_SORT_LEVELS);
    this.destroyBlessedShelfTutorial();
  }

  destroyBlessedShelfTutorial() {
    if (!this.tutorialContainer) return;

    this.tutorialContainer.destroy(true);
    this.tutorialContainer = null;
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
    if (this.tutorialContainer) return;
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

    if (!canMove(this.shelves, sourceIndex, targetIndex, this.capacity, this.getMoveOptions())) {
      this.selectedShelfIndex = null;
      this.redrawBoard();
      this.playSpiritRefusalFeedback(sourceIndex);
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

    applyMove(this.shelves, sourceIndex, targetIndex, this.capacity, this.getMoveOptions());
    this.moveHistory.push({ sourceIndex, targetIndex, spirit: movingSpirit });
    this.moveCount += 1;
    this.updateHud();
    this.hiddenSpirit = {
      shelfIndex: targetIndex,
      stackIndex: this.shelves[targetIndex].length - 1
    };
    this.redrawBoard();

    const movingVisual = this.createSpiritVisual(start.x, start.y, movingSpirit).setDepth(40);
    const movingScaleX = movingVisual.scaleX;
    const movingScaleY = movingVisual.scaleY;
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - Phaser.Math.Clamp(layout.shelfHeight * 0.3, 42, 84)
    };

    this.tweens.add({
      targets: movingVisual,
      x: midPoint.x,
      y: midPoint.y,
      scaleX: movingScaleX * 1.08,
      scaleY: movingScaleY * 1.08,
      duration: 150,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: movingVisual,
          x: end.x,
          y: end.y,
          scaleX: movingScaleX,
          scaleY: movingScaleY,
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
      y: layout.shelfHeight - layout.spiritBottomOffset - stackIndex * layout.slotGap
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
    const stackIndex = this.shelves[shelfIndex]?.length - 1;
    const landedSpirit = view.spiritViews?.[stackIndex];

    if (landedSpirit) {
      this.tweens.killTweensOf(landedSpirit);

      const baseY = landedSpirit.y;
      const baseScaleX = landedSpirit.scaleX;
      const baseScaleY = landedSpirit.scaleY;

      this.tweens.add({
        targets: landedSpirit,
        y: baseY + 2,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 0.94,
        duration: 90,
        yoyo: true,
        ease: "Sine.easeOut",
        onComplete: () => {
          if (!landedSpirit.active) return;

          landedSpirit.y = baseY;
          landedSpirit.setAngle(0);
          landedSpirit.setScale(baseScaleX, baseScaleY);
          const spiritType = this.shelves[shelfIndex]?.[stackIndex] ?? "fire";
          this.applySpiritIdleAnimation(landedSpirit, shelfIndex, stackIndex, false, spiritType);
        }
      });
    }

    this.tweens.add({
      targets: view.container,
      scaleX: 1.018,
      scaleY: 1.018,
      duration: 96,
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
    const horizontalPadding = layout.isMobile ? 20 : 42;
    const verticalPadding = layout.isMobile ? 34 : 56;

    return this.add
      .rectangle(x, y + layout.shelfHeight / 2, layout.shelfWidth + horizontalPadding, layout.shelfHeight + verticalPadding, color, layout.isMobile ? 0.18 : 0.22)
      .setStrokeStyle(layout.isMobile ? 3 : 4, color, 0.9)
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
      .rectangle(view.position.x, view.position.y + layout.shelfHeight / 2, layout.shelfWidth + (layout.isMobile ? 24 : 34), layout.shelfHeight + (layout.isMobile ? 30 : 40), COLORS.invalid, 0.34)
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

  playSpiritRefusalFeedback(shelfIndex) {
    const view = this.shelfViews[shelfIndex];
    const shelf = this.shelves[shelfIndex];
    if (!view || !shelf?.length) return;

    const stackIndex = shelf.length - 1;
    const spirit = view.spiritViews?.[stackIndex];
    const spiritType = shelf[stackIndex];
    const personality = SPIRIT_PERSONALITIES[spiritType] ?? SPIRIT_PERSONALITIES.fire;
    const layout = this.getCurrentLayout();

    if (spirit) {
      this.tweens.killTweensOf(spirit);
      const baseX = spirit.x;
      const baseScaleX = spirit.scaleX;
      const baseScaleY = spirit.scaleY;

      this.tweens.add({
        targets: spirit,
        x: baseX + (layout.isMobile ? 4 : 6),
        scaleX: baseScaleX * 0.97,
        scaleY: baseScaleY * 1.03,
        duration: 48,
        repeat: 3,
        yoyo: true,
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (!spirit.active) return;
          spirit.x = baseX;
          spirit.setScale(baseScaleX, baseScaleY);
        }
      });
    }

    const markerPosition = this.getSpiritWorldPosition(shelfIndex, stackIndex);
    const marker = this.add
      .text(markerPosition.x, markerPosition.y - layout.spiritSize * 0.78, "?", {
        fontFamily: "Arial",
        fontSize: `${layout.isMobile ? 14 : 17}px`,
        color: "#fff0b8",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(38);
    marker.setShadow(0, 1, "#050511", 3);

    this.tweens.add({
      targets: marker,
      y: marker.y - 12,
      alpha: 0,
      scale: 1.2,
      duration: 420 + personality.duration * 0.04,
      ease: "Sine.easeOut",
      onComplete: () => marker.destroy()
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

  playLevelCompleteCelebration() {
    const layout = this.getCurrentLayout();

    this.shelfViews.forEach((view, shelfIndex) => {
      const shelf = this.shelves[shelfIndex];
      if (!view || !isShelfComplete(shelf, this.capacity)) return;

      const spiritType = shelf[0];
      const personality = SPIRIT_PERSONALITIES[spiritType] ?? SPIRIT_PERSONALITIES.fire;

      this.tweens.add({
        targets: view.container,
        y: view.position.y - (layout.isMobile ? 4 : 6),
        scaleX: 1.012,
        scaleY: 1.012,
        duration: 180 + shelfIndex * 22,
        yoyo: true,
        ease: "Sine.easeOut"
      });

      for (let i = 0; i < 3; i += 1) {
        const sparkle = this.add
          .circle(
            view.position.x + (i - 1) * layout.shelfWidth * 0.24,
            view.position.y + 26 + (i % 2) * 14,
            layout.isMobile ? 2.5 : 3.5,
            personality.sparkle,
            0.82
          )
          .setDepth(39);

        this.tweens.add({
          targets: sparkle,
          y: sparkle.y - 18,
          alpha: 0,
          scale: 1.5,
          duration: 620 + i * 80,
          ease: "Sine.easeOut",
          onComplete: () => sparkle.destroy()
        });
      }
    });
  }

  checkWin() {
    if (!isSolved(this.shelves, this.capacity)) return;

    this.hasWon = true;
    const previousCompletion = getLevelCompletion(this.progress, this.currentLevel.id);
    const previousBest = previousCompletion?.bestMoves;
    this.progress = markLevelComplete(this.progress, this.currentLevel.id, this.moveCount, SPIRIT_SORT_LEVELS);
    const nextCompletion = getLevelCompletion(this.progress, this.currentLevel.id);
    this.winResult = {
      bestMoves: nextCompletion?.bestMoves ?? this.moveCount,
      isNewBest: !Number.isFinite(previousBest) || this.moveCount < previousBest
    };
    this.playSound("win");
    this.playLevelCompleteCelebration();
    this.showWinMessage();
  }

  clearWinState() {
    this.hasWon = false;
    this.winResult = null;

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
    const panelHeight = width < 420 ? 224 : 194;
    const panelY = hud.bandHeight + panelHeight / 2 + 14;
    const titleFontSize = width < 420 ? 22 : 28;
    const detailFontSize = width < 420 ? 13 : 16;
    const buttonY = width < 420 ? 78 : 68;

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
      .text(0, width < 420 ? -42 : -36, isLastLevel ? "All shrine levels are restored." : "Shrine restored. Next level is ready.", {
        fontFamily: "Arial",
        fontSize: `${detailFontSize}px`,
        color: "#bfeadf",
        align: "center",
        wordWrap: { width: panelWidth - 30, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    const moveSummary = this.add
      .text(0, width < 420 ? -8 : -4, `Completed in ${this.moveCount} moves`, {
        fontFamily: "Arial",
        fontSize: `${detailFontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const bestSummary = this.add
      .text(0, width < 420 ? 20 : 24, this.getBestMoveSummary(), {
        fontFamily: "Arial",
        fontSize: `${detailFontSize}px`,
        color: this.winResult?.isNewBest ? "#ffe7a8" : "#bfeadf",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const buttons = isLastLevel
      ? [
          this.createWinButton(-Math.min(112, panelWidth * 0.28), buttonY, Math.min(104, panelWidth * 0.28), "Replay", () => this.restartLevel()),
          this.createWinButton(0, buttonY, Math.min(116, panelWidth * 0.32), "Levels", () => this.openLevelSelect()),
          this.createWinButton(Math.min(112, panelWidth * 0.28), buttonY, Math.min(104, panelWidth * 0.28), "Title", () => this.scene.start("TitleScene"))
        ]
      : [
          this.createWinButton(-Math.min(116, panelWidth * 0.29), buttonY, Math.min(104, panelWidth * 0.28), "Restart", () => this.restartLevel()),
          this.createWinButton(0, buttonY, Math.min(116, panelWidth * 0.32), "Levels", () => this.openLevelSelect()),
          this.createWinButton(Math.min(116, panelWidth * 0.29), buttonY, Math.min(118, panelWidth * 0.32), "Next", () => this.goToLevel(this.currentLevelIndex + 1))
        ];

    this.winContainer.add([panel, title, detail, moveSummary, bestSummary, ...buttons]);
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

  getBestMoveSummary() {
    if (!this.winResult) return `Best: ${this.moveCount} moves`;
    return this.winResult.isNewBest
      ? `New best: ${this.winResult.bestMoves} moves`
      : `Best: ${this.winResult.bestMoves} moves`;
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
