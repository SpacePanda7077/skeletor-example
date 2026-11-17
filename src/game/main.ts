import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { AUTO, Game, Types } from "phaser";
import { SkeletorPlugin } from "./scenes/skeletor-phaser";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: "game-container",
    backgroundColor: "#25282b",
    scene: [Boot, MainGame],
    plugins: {
        global: [{ key: "Skeletor", plugin: SkeletorPlugin, start: true }],
    },
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
