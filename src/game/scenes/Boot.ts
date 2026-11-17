import { init } from "@dimforge/rapier2d-compat";
import { Scene } from "phaser";
import { EventBus, GameEvent } from "../EventBus";

/** Loads everything the game needs, starts the physics engine, then hands over to the Game scene. */
export class Boot extends Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        this.load.setPath("assets");
        this.load.image("background", "bg.png");

        // the plugin adds load.skeleton(): it loads the json and every image the rig uses
        this.load.skeleton("hero", "hero/hero.json");
    }

    async create() {
        // React (StrictMode) can destroy the game while Rapier is still loading
        let destroyed = false;
        this.events.once("destroy", () => (destroyed = true));

        EventBus.emit(GameEvent.SceneReady, this);
        await init(); // Rapier is WebAssembly and has to be initialised once
        if (!destroyed) this.scene.start("Game");
    }
}
