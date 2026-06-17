import Phaser from "phaser";
import { SPIRIT_SORT_SPIRIT_IDS } from "../data/spiritSortLevels.js";
import { preloadSpiritManifestTextures } from "../systems/SpiritAssetLoader.js";

const COLORS = {
  backgroundTop: 0x15162f,
  backgroundBottom: 0x262142,
  moon: 0xf6e8b7,
  text: "#fff6dd",
  mutedText: "#c7bfe8"
};

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.createLoadingScreen();
    this.preloadSpiritAssets();
  }

  createLoadingScreen() {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();

    graphics.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1
    );
    graphics.fillRect(0, 0, width, height);

    const moonX = width * 0.68;
    const moonY = Math.max(76, height * 0.28);
    this.add.circle(moonX, moonY, 54, COLORS.moon, 0.08);
    this.add.circle(moonX, moonY, 32, COLORS.moon, 0.7);
    this.add.circle(moonX - 12, moonY - 5, 32, COLORS.backgroundTop, 1);

    this.add
      .text(width / 2, height * 0.52, "Loading spirits...", {
        fontFamily: "Arial",
        fontSize: `${width < 420 ? 17 : 20}px`,
        color: COLORS.text,
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setShadow(0, 2, "#050511", 4);

    this.add
      .text(width / 2, height * 0.52 + 30, "Preparing the shrine shelves", {
        fontFamily: "Arial",
        fontSize: `${width < 420 ? 12 : 14}px`,
        color: COLORS.mutedText
      })
      .setOrigin(0.5)
      .setShadow(0, 1, "#050511", 3);
  }

  async preloadSpiritAssets() {
    try {
      await preloadSpiritManifestTextures(this, SPIRIT_SORT_SPIRIT_IDS);
    } catch {
      // Missing or invalid optional art should never block the game.
    }

    this.scene.start("TitleScene");
  }
}
