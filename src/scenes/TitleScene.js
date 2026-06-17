import Phaser from "phaser";

const COLORS = {
  backgroundTop: 0x15162f,
  backgroundBottom: 0x262142,
  backgroundMid: 0x1d1a38,
  shrineShadow: 0x101225,
  shelfWood: 0x76513c,
  shelfWoodDark: 0x4d3028,
  shelfWoodLight: 0xa87956,
  shelfGold: 0xd7aa68,
  text: "#fff6dd",
  mutedText: "#c7bfe8"
};

const SPIRIT_PREVIEWS = [
  { type: "fire", color: 0xff7a3d, glow: 0xffb36f, label: "FI" },
  { type: "leaf", color: 0x64ca74, glow: 0xa6f0a7, label: "LF" },
  { type: "moon", color: 0x8798ff, glow: 0xc4ccff, label: "MO" },
  { type: "cloud", color: 0xd8f1ff, glow: 0xffffff, label: "CL" },
  { type: "star", color: 0xffd45c, glow: 0xffef9b, label: "ST" }
];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    this.hasStarted = false;
    this.titleContainer = null;
    this.createTitleScreen();
    this.scale.on("resize", this.handleResize, this);
    this.input.keyboard?.on("keydown-ENTER", this.startGame, this);
    this.input.keyboard?.on("keydown-SPACE", this.startGame, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
      this.input.keyboard?.off("keydown-ENTER", this.startGame, this);
      this.input.keyboard?.off("keydown-SPACE", this.startGame, this);
    });
  }

  handleResize() {
    this.createTitleScreen();
  }

  createTitleScreen() {
    if (this.titleContainer) {
      this.titleContainer.destroy(true);
    }

    this.titleContainer = this.add.container(0, 0);
    const { width, height } = this.scale;
    const layout = this.getLayout(width, height);

    this.createBackground(width, height);
    this.createSpiritPreviewRow(width, height, layout);
    this.createTitleCopy(width, layout);
    this.createStartButton(width, layout);
    this.createFooter(width, height, layout);
  }

  getLayout(width, height) {
    const isMobile = width < 700;
    const safeWidth = Math.max(280, width);

    if (isMobile) {
      return {
        isMobile,
        titleY: Math.max(96, height * 0.18),
        titleSize: Phaser.Math.Clamp(width * 0.085, 28, 36),
        subtitleY: Math.max(140, height * 0.25),
        subtitleSize: Phaser.Math.Clamp(width * 0.04, 14, 17),
        hintY: Math.max(174, height * 0.3),
        hintSize: Phaser.Math.Clamp(width * 0.034, 12, 14),
        spiritsY: Math.max(238, height * 0.42),
        spiritSize: Phaser.Math.Clamp(width * 0.11, 34, 44),
        buttonY: Math.min(height - 148, Math.max(338, height * 0.64)),
        buttonWidth: Phaser.Math.Clamp(safeWidth * 0.44, 150, 178),
        buttonHeight: 48,
        buttonFontSize: 20,
        footerY: height - 32
      };
    }

    return {
      isMobile,
      titleY: height * 0.24,
      titleSize: 54,
      subtitleY: height * 0.34,
      subtitleSize: 22,
      hintY: height * 0.4,
      hintSize: 16,
      spiritsY: height * 0.55,
      spiritSize: 52,
      buttonY: height * 0.72,
      buttonWidth: 190,
      buttonHeight: 54,
      buttonFontSize: 22,
      footerY: height - 34
    };
  }

  createBackground(width, height) {
    const graphics = this.add.graphics();
    this.titleContainer.add(graphics);

    graphics.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1
    );
    graphics.fillRect(0, 0, width, height);

    graphics.fillGradientStyle(
      0x000000,
      0x000000,
      COLORS.backgroundMid,
      COLORS.backgroundMid,
      0,
      0,
      0.28,
      0.28
    );
    graphics.fillRect(0, height * 0.52, width, height * 0.48);

    this.createMoon(width, height);
    this.createStars(width, height);
    this.createShrineSilhouette(width, height);
  }

  createMoon(width, height) {
    const moonX = width * 0.78;
    const moonY = Math.max(68, height * 0.15);

    this.titleContainer.add(this.add.circle(moonX, moonY, 86, 0xf6e8b7, 0.07));
    this.titleContainer.add(this.add.circle(moonX, moonY, 58, 0xf6e8b7, 0.12));
    this.titleContainer.add(this.add.circle(moonX, moonY, 38, 0xf6e8b7, 0.84));
    this.titleContainer.add(this.add.circle(moonX - 15, moonY - 7, 38, COLORS.backgroundTop, 1));
  }

  createStars(width, height) {
    for (let i = 0; i < 24; i += 1) {
      const x = 22 + ((i * 71) % Math.max(240, width - 44));
      const y = 34 + ((i * 43) % Math.max(120, height * 0.5));
      const dot = this.add.circle(x, y, 1 + (i % 3) * 0.6, 0xffe9a8, 0.12 + (i % 4) * 0.04);
      this.titleContainer.add(dot);
    }

    for (let i = 0; i < 12; i += 1) {
      const x = 30 + ((i * 89) % Math.max(260, width - 60));
      const y = height * 0.33 + ((i * 37) % Math.max(80, height * 0.25));
      const firefly = this.add.circle(x, y, 2, 0xffe8a0, 0.28);
      this.titleContainer.add(firefly);
      this.tweens.add({
        targets: firefly,
        alpha: 0.08,
        duration: 1200 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  createShrineSilhouette(width, height) {
    const graphics = this.add.graphics();
    this.titleContainer.add(graphics);

    graphics.fillStyle(0x0f1427, 0.88);
    graphics.fillTriangle(0, height, width * 0.18, height * 0.68, width * 0.38, height);
    graphics.fillTriangle(width * 0.22, height, width * 0.5, height * 0.63, width * 0.78, height);
    graphics.fillTriangle(width * 0.62, height, width * 0.86, height * 0.69, width, height);

    const shrineX = width * 0.5;
    const shrineY = height * 0.68;
    const scale = Phaser.Math.Clamp(width / 960, 0.44, 0.95);
    graphics.fillStyle(COLORS.shrineShadow, 0.9);
    graphics.fillRect(shrineX - 72 * scale, shrineY, 14 * scale, 118 * scale);
    graphics.fillRect(shrineX + 58 * scale, shrineY, 14 * scale, 118 * scale);
    graphics.fillRect(shrineX - 104 * scale, shrineY - 14 * scale, 208 * scale, 14 * scale);
    graphics.fillRect(shrineX - 82 * scale, shrineY - 34 * scale, 164 * scale, 12 * scale);
    graphics.fillTriangle(shrineX - 122 * scale, shrineY - 14 * scale, shrineX, shrineY - 66 * scale, shrineX + 122 * scale, shrineY - 14 * scale);
    graphics.fillStyle(0xf7d783, 0.14);
    graphics.fillRect(shrineX - 10 * scale, shrineY + 28 * scale, 20 * scale, 42 * scale);
  }

  createTitleCopy(width, layout) {
    const title = this.add
      .text(width / 2, layout.titleY, "Spirit Shelf Sort", {
        fontFamily: "Arial",
        fontSize: `${layout.titleSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    title.setShadow(0, 3, "#050511", 6);

    const subtitle = this.add
      .text(width / 2, layout.subtitleY, "Sort tiny spirits back to their shrine shelves", {
        fontFamily: "Arial",
        fontSize: `${layout.subtitleSize}px`,
        color: COLORS.mutedText,
        align: "center",
        wordWrap: { width: Math.min(520, width - 36), useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    subtitle.setShadow(0, 2, "#050511", 4);

    const hint = this.add
      .text(width / 2, layout.hintY, "Tap spirits, sort shelves, restore the shrine", {
        fontFamily: "Arial",
        fontSize: `${layout.hintSize}px`,
        color: "#d9cfa8",
        align: "center",
        wordWrap: { width: Math.min(500, width - 44), useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    hint.setShadow(0, 1, "#050511", 3);

    this.titleContainer.add([title, subtitle, hint]);
  }

  createSpiritPreviewRow(width, height, layout) {
    const count = layout.isMobile ? 3 : 5;
    const spacing = Phaser.Math.Clamp(width / (count + 2), 54, layout.isMobile ? 74 : 92);
    const startX = width / 2 - ((count - 1) * spacing) / 2;

    SPIRIT_PREVIEWS.slice(0, count).forEach((spirit, index) => {
      const x = startX + index * spacing;
      const y = layout.spiritsY + (index % 2 === 0 ? -6 : 8);
      const icon = this.createSpiritIcon(x, y, layout.spiritSize, spirit);
      this.titleContainer.add(icon);

      this.tweens.add({
        targets: icon,
        y: y - 8,
        duration: 1500 + index * 140,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });

    const mist = this.add.ellipse(width / 2, Math.min(height - 118, layout.spiritsY + layout.spiritSize * 1.25), width * 0.7, layout.isMobile ? 28 : 40, 0xf7d783, 0.06);
    this.titleContainer.add(mist);
  }

  createSpiritIcon(x, y, size, spirit) {
    const container = this.add.container(x, y);
    const glow = this.add.circle(0, 0, size * 0.72, spirit.glow, 0.16);
    const shadow = this.add.ellipse(0, size * 0.52, size * 0.78, size * 0.2, 0x0c0b18, 0.22);
    const body = this.add.ellipse(0, 3, size * 0.78, size * 0.7, spirit.color, 1).setStrokeStyle(2, 0xffffff, 0.48);
    const eyeLeft = this.add.circle(-size * 0.16, -size * 0.08, Math.max(2, size * 0.045), 0x1d1b2d, 1);
    const eyeRight = this.add.circle(size * 0.16, -size * 0.08, Math.max(2, size * 0.045), 0x1d1b2d, 1);
    const label = this.add
      .text(0, size * 0.16, spirit.label, {
        fontFamily: "Arial",
        fontSize: `${Math.max(10, size * 0.22)}px`,
        color: "#182031",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([glow, shadow, ...this.createSpiritAccentParts(spirit.type, spirit, size), body, eyeLeft, eyeRight, label]);
    return container;
  }

  createSpiritAccentParts(type, spirit, size) {
    if (type === "fire") {
      return [this.add.triangle(0, -size * 0.3, 0, -size * 0.52, -size * 0.24, size * 0.14, size * 0.24, size * 0.14, spirit.color, 1)];
    }

    if (type === "leaf") {
      return [
        this.add.ellipse(-size * 0.12, -size * 0.46, size * 0.28, size * 0.14, 0xa7ee9a, 1).setAngle(-24),
        this.add.ellipse(size * 0.12, -size * 0.46, size * 0.28, size * 0.14, 0xa7ee9a, 1).setAngle(24)
      ];
    }

    if (type === "moon") {
      return [this.add.circle(-size * 0.2, -size * 0.32, size * 0.12, 0xfff1b8, 0.88)];
    }

    if (type === "star") {
      return [this.add.star(size * 0.28, -size * 0.34, 4, size * 0.04, size * 0.11, 0xffffff, 0.8)];
    }

    return [];
  }

  createStartButton(width, layout) {
    const button = this.add.container(width / 2, layout.buttonY);
    const background = this.add
      .rectangle(0, 0, layout.buttonWidth, layout.buttonHeight, 0x342538, 0.96)
      .setStrokeStyle(2, COLORS.shelfGold, 0.86);
    const shine = this.add.rectangle(0, -layout.buttonHeight * 0.34, layout.buttonWidth - 18, 5, 0xffe2a5, 0.18);
    const leftCap = this.add.rectangle(-layout.buttonWidth / 2 + 8, 0, 5, layout.buttonHeight - 13, COLORS.shelfWoodLight, 0.75);
    const rightCap = this.add.rectangle(layout.buttonWidth / 2 - 8, 0, 5, layout.buttonHeight - 13, COLORS.shelfWoodLight, 0.75);
    const text = this.add
      .text(0, 0, "Start", {
        fontFamily: "Arial",
        fontSize: `${layout.buttonFontSize}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    button.add([background, shine, leftCap, rightCap, text]);
    button.setSize(layout.buttonWidth, layout.buttonHeight);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.startGame());
    button.on("pointerover", () => background.setFillStyle(0x4b3b68, 0.98));
    button.on("pointerout", () => background.setFillStyle(0x342538, 0.96));

    this.tweens.add({
      targets: button,
      scaleX: 1.025,
      scaleY: 1.025,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.titleContainer.add(button);
  }

  createFooter(width, height, layout) {
    const footer = this.add
      .text(width / 2, layout.footerY, "MVP", {
        fontFamily: "Arial",
        fontSize: `${layout.isMobile ? 11 : 12}px`,
        color: "#a99dc8",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    footer.setAlpha(0.72);
    this.titleContainer.add(footer);
  }

  startGame() {
    if (this.hasStarted) return;

    this.hasStarted = true;
    this.playButtonTone();
    this.cameras.main.fadeOut(180, 10, 8, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("SpiritSortScene");
    });
  }

  playButtonTone() {
    const audioContext = this.sound?.context;
    if (!audioContext) return;

    const play = () => {
      try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(392, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.018, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.11);
      } catch {
        // Audio can be unavailable before the browser unlocks it; starting the game should still work.
      }
    };

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
}
