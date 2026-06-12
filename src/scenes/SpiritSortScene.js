import Phaser from "phaser";
import { cloneLevel, SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import { applyMove, canMove, isShelfComplete, isSolved } from "../systems/SortRules.js";

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
  shelfWood: 0x76513c,
  shelfWoodLight: 0xa87956,
  shelfInside: 0x2d243b,
  selected: 0xf7d783,
  complete: 0x9df0d2,
  invalid: 0xff6b7a,
  text: "#fff6dd",
  mutedText: "#c7bfe8"
};

const LAYOUT = {
  shelfWidth: 116,
  shelfHeight: 284,
  shelfGap: 28,
  spiritSize: 52,
  slotGap: 58,
  boardTop: 230
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

    this.add.circle(812, 92, 42, 0xf6e8b7, 0.88);
    this.add.circle(794, 84, 42, COLORS.backgroundTop, 1);

    const hills = this.add.graphics();
    hills.fillStyle(0x0f1427, 0.86);
    hills.fillTriangle(0, height, 170, 438, 360, height);
    hills.fillTriangle(210, height, 472, 414, 720, height);
    hills.fillTriangle(580, height, 798, 432, width, height);

    for (let i = 0; i < 18; i += 1) {
      const x = 56 + i * 51;
      const y = 96 + ((i * 37) % 90);
      this.add.circle(x, y, 2 + (i % 3), 0xffe9a8, 0.28);
    }
  }

  createHud() {
    this.titleText = this.add
      .text(48, 34, "Spirit Shelf Sort", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setDepth(20);

    this.levelText = this.add
      .text(50, 77, "", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: COLORS.mutedText
      })
      .setDepth(20);

    this.restartButton = this.createButton(742, 42, 142, "Restart", () => this.restartLevel());
    this.previousButton = this.createButton(650, 42, 74, "Prev", () => this.goToLevel(this.currentLevelIndex - 1));
    this.nextButton = this.createButton(868, 42, 74, "Next", () => this.goToLevel(this.currentLevelIndex + 1));

    this.updateHud();
  }

  createButton(x, y, width, label, onClick) {
    const container = this.add.container(x, y).setDepth(25);
    const background = this.add
      .rectangle(0, 0, width, 38, 0x342b4d, 0.94)
      .setStrokeStyle(2, 0xc2a86e, 0.72);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([background, text]);
    container.setSize(width, 38);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", onClick);
    container.on("pointerover", () => background.setFillStyle(0x4b3b68, 0.98));
    container.on("pointerout", () => background.setFillStyle(0x342b4d, 0.94));

    return container;
  }

  registerKeyboard() {
    this.input.keyboard.on("keydown-R", () => this.restartLevel());
    this.input.keyboard.on("keydown-N", () => this.goToLevel(this.currentLevelIndex + 1));
    this.input.keyboard.on("keydown-P", () => this.goToLevel(this.currentLevelIndex - 1));
  }

  updateHud() {
    this.levelText.setText(
      `Level ${this.currentLevel.id} of ${SPIRIT_SORT_LEVELS.length}: ${this.currentLevel.name}`
    );

    this.previousButton.setAlpha(this.currentLevelIndex === 0 ? 0.45 : 1);
    this.nextButton.setAlpha(this.currentLevelIndex === SPIRIT_SORT_LEVELS.length - 1 ? 0.45 : 1);
  }

  restartLevel() {
    if (this.isAnimating) return;

    this.loadLevel(this.currentLevelIndex);
    this.updateHud();
    this.redrawBoard();
  }

  goToLevel(levelIndex) {
    if (this.isAnimating) return;

    const nextIndex = Phaser.Math.Clamp(levelIndex, 0, SPIRIT_SORT_LEVELS.length - 1);
    if (nextIndex === this.currentLevelIndex) return;

    this.loadLevel(nextIndex);
    this.updateHud();
    this.redrawBoard();
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
    const glowAlpha = selected ? 0.34 : complete ? 0.22 : 0;
    const glow = this.add.rectangle(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth + 28, LAYOUT.shelfHeight + 34, glowColor, glowAlpha);
    glow.setStrokeStyle(selected ? 4 : 2, glowColor, selected || complete ? 0.85 : 0);

    const back = this.add
      .rectangle(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth, LAYOUT.shelfHeight, COLORS.shelfInside, 0.84)
      .setStrokeStyle(4, COLORS.shelfWoodLight, 0.92);

    const leftPost = this.add.rectangle(-LAYOUT.shelfWidth / 2 + 9, LAYOUT.shelfHeight / 2, 14, LAYOUT.shelfHeight + 18, COLORS.shelfWood, 1);
    const rightPost = this.add.rectangle(LAYOUT.shelfWidth / 2 - 9, LAYOUT.shelfHeight / 2, 14, LAYOUT.shelfHeight + 18, COLORS.shelfWood, 1);
    const base = this.add.rectangle(0, LAYOUT.shelfHeight + 5, LAYOUT.shelfWidth + 26, 20, COLORS.shelfWoodLight, 1);
    const top = this.add.rectangle(0, -5, LAYOUT.shelfWidth + 18, 16, COLORS.shelfWoodLight, 1);

    const zone = this.add.zone(0, LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth + 26, LAYOUT.shelfHeight + 36);
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.handleShelfTap(index));

    container.add([glow, back, leftPost, rightPost, base, top]);

    shelf.forEach((spiritType, stackIndex) => {
      if (this.shouldHideSpirit(index, stackIndex)) return;

      const local = this.getSpiritLocalPosition(stackIndex);
      const spirit = this.createSpiritVisual(local.x, local.y, spiritType);
      container.add(spirit);
    });

    if (complete) {
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

    const glow = this.add.circle(0, 0, LAYOUT.spiritSize / 2 + 8, config.glow, 0.2);
    const body = this.add.circle(0, 0, LAYOUT.spiritSize / 2, config.color, 1);
    body.setStrokeStyle(3, 0xffffff, 0.55);

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

    container.add([glow, body, eyeLeft, eyeRight, label]);
    return container;
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

    applyMove(this.shelves, sourceIndex, targetIndex);
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
            this.playLandingFeedback(targetIndex);
            this.isAnimating = false;
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

  playLandingFeedback(shelfIndex) {
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

    this.createSparkles(view.position.x, view.position.y + 58);
  }

  playInvalidMoveFeedback(shelfIndex) {
    const view = this.shelfViews[shelfIndex];
    if (!view) return;

    const flash = this.add
      .rectangle(view.position.x, view.position.y + LAYOUT.shelfHeight / 2, LAYOUT.shelfWidth + 30, LAYOUT.shelfHeight + 36, COLORS.invalid, 0.22)
      .setDepth(35);

    this.tweens.add({
      targets: view.container,
      x: {
        from: view.position.x - 10,
        to: view.position.x + 10
      },
      duration: 45,
      repeat: 3,
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

  createSparkles(x, y) {
    for (let i = 0; i < 7; i += 1) {
      const sparkle = this.add.circle(x, y, 3, 0xfff0b6, 0.9).setDepth(36);
      const angle = (Math.PI * 2 * i) / 7;
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
    this.showWinMessage();
  }

  showWinMessage() {
    if (this.winContainer) {
      this.winContainer.destroy(true);
    }

    this.winContainer = this.add.container(this.scale.width / 2, 154).setDepth(50);

    const panel = this.add
      .rectangle(0, 0, 440, 106, 0x211c37, 0.92)
      .setStrokeStyle(3, COLORS.complete, 0.9);
    const title = this.add
      .text(0, -24, "Shrine restored!", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const detail = this.add
      .text(0, 13, "Press R to replay or N for the next level.", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#bfeadf"
      })
      .setOrigin(0.5);

    this.winContainer.add([panel, title, detail]);
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
}
