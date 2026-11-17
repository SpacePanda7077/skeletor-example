import { Scene } from "phaser";
import { EventBus } from "../EventBus";
import { init } from "@dimforge/rapier2d-compat";

export class Boot extends Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        this.load.setPath("assets");
    }

    create() {
        this.initializeRapier();
        EventBus.emit("current-scene-ready", this);
    }
    async initializeRapier() {
        await init().then(async () => {
            this.scene.start("Game");
        });
    }
}
