import { AUTO, Game, type Types } from "phaser";
import { SkeletorPlugin } from "../skeletor";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-container",
    backgroundColor: "#1b1f2a",
    scene: [Boot, MainGame],
    plugins: {
        // installs add.skeleton() and load.skeleton()
        global: [{ key: "Skeletor", plugin: SkeletorPlugin, start: true }],
    },
};

const StartGame = (parent: string) => new Game({ ...config, parent });

export default StartGame;
