export type SkinName = "default" | "ember" | "frost";

/** Everything the React panel can switch. The game scene owns the truth and echoes changes back. */
export interface DemoSettings {
    /** gun in hands: arm IK is blended in and out with setIKWeight */
    armed: boolean;
    /** torso plays "idle" on top of the run legs (playLayer with a bone mask) */
    runAndGun: boolean;
    /** feet follow the terrain (plantBone) */
    footPlant: boolean;
    /** scene lights shine on the sprites (setLit) */
    lights: boolean;
    /** Rapier colliders, ray casts and foot-plant gizmos */
    debug: boolean;
    /** slow motion: Skeleton.setTimeScale plus physics */
    timeScale: number;
    /** setSkin: swap every sprite of the character for a recoloured copy */
    skin: SkinName;
}

export const DEFAULT_SETTINGS: DemoSettings = {
    armed: true,
    runAndGun: true,
    footPlant: true,
    lights: true,
    debug: false,
    timeScale: 1,
    skin: "default",
};

/** What the HUD shows, sent a few times a second. */
export interface HudState {
    locomotion: "idle" | "run" | "slide" | "air";
    grounded: boolean;
    facing: "left" | "right";
    upperLayer: boolean;
    footPlant: { left: number; right: number };
}
