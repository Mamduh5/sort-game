import Phaser from "phaser";
import "./styles.css";
import TitleScene from "./scenes/TitleScene.js";
import SpiritSortScene from "./scenes/SpiritSortScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 640,
  backgroundColor: "#15162f",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [TitleScene, SpiritSortScene]
};

new Phaser.Game(config);
