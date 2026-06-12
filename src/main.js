import Phaser from "phaser";
import "./styles.css";
import SpiritSortScene from "./scenes/SpiritSortScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 640,
  backgroundColor: "#15162f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [SpiritSortScene]
};

new Phaser.Game(config);
