import { Events } from "phaser";

/** Used to emit events between React components and Phaser scenes. */
export const EventBus = new Events.EventEmitter();

export const GameEvent = {
    /** (scene) a scene is ready to be used from React */
    SceneReady: "current-scene-ready",
    /** (Partial<DemoSettings>) React asks the game to change something */
    SettingsPatch: "settings-patch",
    /** (DemoSettings) the game tells React what is on now */
    SettingsChanged: "settings-changed",
    /** (HudState) live numbers for the panel */
    Hud: "hud",
} as const;
