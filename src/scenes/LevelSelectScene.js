import Phaser from "phaser";
import { SPIRIT_SORT_LEVELS } from "../data/spiritSortLevels.js";
import {
  getLevelCompletion,
  isLevelUnlocked,
  loadProgress,
  markLevelStarted,
  resetProgress
} from "../systems/ProgressSave.js";

const COLORS = {
  backgroundTop: 0x15162f,
  backgroundBottom: 0x262142,
  backgroundMid: 0x1d1a38,
  shrineShadow: 0x101225,
  shelfWood: 0x76513c,
  shelfWoodDark: 0x4d3028,
  shelfWoodLight: 0xa87956,
  shelfGold: 0xd7aa68,
  selected: 0xf7d783,
  complete: 0x9df0d2,
  blessed: 0x8feeff,
  blessedGold: 0xffe6a5,
  text: "#fff6dd",
  mutedText: "#c7bfe8"
};

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create() {
    this.progress = loadProgress(SPIRIT_SORT_LEVELS);
    this.container = null;
    this.confirmPanel = null;
    this.createLevelSelect();
    this.scale.on("resize", this.handleResize, this);
    this.input.keyboard?.on("keydown-ESC", this.goBack, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
      this.input.keyboard?.off("keydown-ESC", this.goBack, this);
    });
  }

  handleResize() {
    this.createLevelSelect();
  }

  createLevelSelect() {
    if (this.container) {
      this.container.destroy(true);
    }

    this.container = this.add.container(0, 0);
    const { width, height } = this.scale;
    const layout = this.getLayout(width, height);

    this.createBackground(width, height);
    this.createHeader(width, layout);
    this.createLevelGrid(width, layout);
    this.createFooterButtons(width, height, layout);
  }

  getLayout(width, height) {
    const isMobile = width < 700;
    const columns = isMobile ? (width < 340 ? 4 : 5) : 6;
    const gap = isMobile ? 6 : 10;
    const cardWidth = isMobile
      ? Phaser.Math.Clamp((width - 28 - gap * (columns - 1)) / columns, 54, 72)
      : 104;
    const cardHeight = isMobile ? 44 : 58;
    const gridTop = isMobile ? 106 : 136;
    const titleSize = isMobile ? 26 : 38;
    const subtitleSize = isMobile ? 12 : 16;
    const buttonY = height - (isMobile ? 36 : 42);

    return {
      isMobile,
      columns,
      gap,
      cardWidth,
      cardHeight,
      gridTop,
      titleSize,
      subtitleSize,
      buttonY,
      buttonHeight: isMobile ? 32 : 38,
      buttonFontSize: isMobile ? 12 : 15
    };
  }

  createBackground(width, height) {
    const graphics = this.add.graphics();
    this.container.add(graphics);

    graphics.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1
    );
    graphics.fillRect(0, 0, width, height);

    graphics.fillGradientStyle(0x000000, 0x000000, COLORS.backgroundMid, COLORS.backgroundMid, 0, 0, 0.25, 0.25);
    graphics.fillRect(0, height * 0.52, width, height * 0.48);

    const moonX = width * 0.82;
    const moonY = Math.max(62, height * 0.16);
    this.container.add(this.add.circle(moonX, moonY, 74, 0xf6e8b7, 0.07));
    this.container.add(this.add.circle(moonX, moonY, 44, 0xf6e8b7, 0.62));
    this.container.add(this.add.circle(moonX - 14, moonY - 5, 44, COLORS.backgroundTop, 1));

    for (let i = 0; i < 26; i += 1) {
      const x = 18 + ((i * 73) % Math.max(240, width - 36));
      const y = 32 + ((i * 41) % Math.max(170, height * 0.55));
      this.container.add(this.add.circle(x, y, 1 + (i % 3) * 0.45, 0xffe9a8, 0.12 + (i % 4) * 0.04));
    }

    graphics.fillStyle(COLORS.shrineShadow, 0.88);
    graphics.fillTriangle(0, height, width * 0.18, height * 0.7, width * 0.38, height);
    graphics.fillTriangle(width * 0.62, height, width * 0.84, height * 0.7, width, height);
  }

  createHeader(width, layout) {
    const title = this.add
      .text(width / 2, layout.isMobile ? 44 : 58, "Choose a Shelf", {
        fontFamily: "Arial",
        fontSize: `${layout.titleSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    title.setShadow(0, 3, "#050511", 6);

    const subtitle = this.add
      .text(width / 2, layout.isMobile ? 78 : 100, "Restore each shrine shelf at your own pace", {
        fontFamily: "Arial",
        fontSize: `${layout.subtitleSize}px`,
        color: COLORS.mutedText,
        align: "center",
        wordWrap: { width: Math.min(520, width - 32), useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    subtitle.setShadow(0, 1, "#050511", 3);

    this.container.add([title, subtitle]);
  }

  createLevelGrid(width, layout) {
    const rows = Math.ceil(SPIRIT_SORT_LEVELS.length / layout.columns);
    const totalWidth = layout.columns * layout.cardWidth + (layout.columns - 1) * layout.gap;
    const startX = width / 2 - totalWidth / 2 + layout.cardWidth / 2;

    SPIRIT_SORT_LEVELS.forEach((level, index) => {
      const row = Math.floor(index / layout.columns);
      const column = index % layout.columns;
      const x = startX + column * (layout.cardWidth + layout.gap);
      const y = layout.gridTop + row * (layout.cardHeight + layout.gap);
      const card = this.createLevelCard(x, y, layout, level);
      this.container.add(card);
    });
  }

  createLevelCard(x, y, layout, level) {
    const unlocked = isLevelUnlocked(this.progress, level.id);
    const completion = getLevelCompletion(this.progress, level.id);
    const completed = Boolean(completion?.completed);
    const current = this.progress.currentLevelId === level.id;
    const blessed = (level.blessedShelves ?? []).length > 0;
    const container = this.add.container(x, y);
    const fill = unlocked ? 0x342538 : 0x17142d;
    const stroke = completed ? COLORS.complete : current ? COLORS.selected : COLORS.shelfGold;
    const alpha = unlocked ? 0.96 : 0.58;
    const background = this.add
      .rectangle(0, 0, layout.cardWidth, layout.cardHeight, fill, alpha)
      .setStrokeStyle(current ? 3 : 2, stroke, unlocked ? 0.82 : 0.34);
    const shine = this.add.rectangle(0, -layout.cardHeight * 0.34, layout.cardWidth - 12, 4, 0xffe2a5, unlocked ? 0.14 : 0.05);
    const levelText = this.add
      .text(0, completed ? -12 : -4, `${level.id}`, {
        fontFamily: "Arial",
        fontSize: `${layout.isMobile ? 18 : 24}px`,
        color: unlocked ? COLORS.text : "#766f92",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const statusText = this.add
      .text(0, completed ? 11 : 16, this.getLevelCardStatus(unlocked, completed, completion), {
        fontFamily: "Arial",
        fontSize: `${layout.isMobile ? 10 : 12}px`,
        color: completed ? "#b9fff0" : unlocked ? COLORS.mutedText : "#7c7399",
        fontStyle: completed ? "bold" : "normal"
      })
      .setOrigin(0.5);

    container.add([background, shine, levelText, statusText]);

    if (blessed) {
      const markerX = layout.cardWidth / 2 - (layout.isMobile ? 9 : 13);
      const markerY = -layout.cardHeight / 2 + (layout.isMobile ? 9 : 13);
      const markerGlow = this.add.circle(markerX, markerY, layout.isMobile ? 8 : 10, COLORS.blessed, unlocked ? 0.16 : 0.08);
      const marker = this.add.star(markerX, markerY, 5, layout.isMobile ? 2.4 : 3, layout.isMobile ? 5.5 : 7, COLORS.blessedGold, unlocked ? 0.9 : 0.42);
      container.add([markerGlow, marker]);
    }
    container.setSize(layout.cardWidth, layout.cardHeight);

    if (unlocked) {
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", () => this.startLevel(level.id));
      container.on("pointerover", () => background.setFillStyle(0x4b3b68, 0.98));
      container.on("pointerout", () => background.setFillStyle(fill, alpha));
    } else {
      const lock = this.add.text(layout.cardWidth * 0.28, -layout.cardHeight * 0.28, "LOCK", {
        fontFamily: "Arial",
        fontSize: `${layout.isMobile ? 8 : 9}px`,
        color: "#7c7399",
        fontStyle: "bold"
      }).setOrigin(0.5);
      container.add(lock);
    }

    return container;
  }

  getLevelCardStatus(unlocked, completed, completion) {
    if (!unlocked) return "locked";
    if (completed && Number.isFinite(completion.bestMoves)) return `best ${completion.bestMoves}`;
    if (completed) return "done";
    return "open";
  }

  createFooterButtons(width, height, layout) {
    const resetWidth = layout.isMobile ? 94 : 124;
    const backWidth = layout.isMobile ? 78 : 102;
    const gap = layout.isMobile ? 10 : 14;
    const startX = width / 2 - (backWidth + resetWidth + gap) / 2;
    const back = this.createButton(startX + backWidth / 2, layout.buttonY, backWidth, "Back", () => this.goBack(), layout);
    const reset = this.createButton(startX + backWidth + gap + resetWidth / 2, layout.buttonY, resetWidth, "Reset Progress", () => this.showResetConfirm(), layout, true);
    this.container.add([back, reset]);
  }

  createButton(x, y, width, label, onClick, layout, secondary = false) {
    const container = this.add.container(x, y);
    const background = this.add
      .rectangle(0, 0, width, layout.buttonHeight, secondary ? 0x211c37 : 0x342538, 0.96)
      .setStrokeStyle(2, COLORS.shelfGold, secondary ? 0.46 : 0.78);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: `${layout.buttonFontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([background, text]);
    container.setSize(width, layout.buttonHeight);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", onClick);
    container.on("pointerover", () => background.setFillStyle(0x4b3b68, 0.98));
    container.on("pointerout", () => background.setFillStyle(secondary ? 0x211c37 : 0x342538, 0.96));
    return container;
  }

  showResetConfirm() {
    if (this.confirmPanel) {
      this.confirmPanel.destroy(true);
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(360, width - 28);
    this.confirmPanel = this.add.container(width / 2, height / 2).setDepth(80);

    const scrim = this.add.rectangle(0, 0, width, height, 0x070711, 0.55);
    scrim.setInteractive();
    const panel = this.add.rectangle(0, 0, panelWidth, 166, 0x211c37, 0.96).setStrokeStyle(3, COLORS.shelfGold, 0.78);
    const title = this.add.text(0, -48, "Reset all progress?", {
      fontFamily: "Arial",
      fontSize: "21px",
      color: COLORS.text,
      fontStyle: "bold"
    }).setOrigin(0.5);
    const detail = this.add.text(0, -14, "Completed levels and best moves will be cleared.", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: COLORS.mutedText,
      align: "center",
      wordWrap: { width: panelWidth - 36, useAdvancedWrap: true }
    }).setOrigin(0.5);
    const layout = { buttonHeight: 34, buttonFontSize: 14 };
    const cancel = this.createButton(-64, 45, 104, "Cancel", () => {
      this.confirmPanel.destroy(true);
      this.confirmPanel = null;
    }, layout, true);
    const reset = this.createButton(64, 45, 104, "Reset", () => {
      this.progress = resetProgress(SPIRIT_SORT_LEVELS, true, this.progress);
      this.confirmPanel.destroy(true);
      this.confirmPanel = null;
      this.createLevelSelect();
    }, layout);

    this.confirmPanel.add([scrim, panel, title, detail, cancel, reset]);
  }

  startLevel(levelId) {
    if (!isLevelUnlocked(this.progress, levelId)) return;

    this.progress = markLevelStarted(this.progress, levelId, SPIRIT_SORT_LEVELS);
    this.scene.start("SpiritSortScene", { levelId });
  }

  goBack() {
    this.scene.start("TitleScene");
  }
}
