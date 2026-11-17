import { Geom, type Scene } from "phaser";
import type { Skeleton, SkeletonOptions } from "../../skeletor";
import { PLAYER } from "../constants";
import type { Skin } from "../skins";
import type { Terrain } from "../world/Terrain";

/** Rough size of the character, used for bullet hits. The origin is at the feet. */
const HITBOX = { halfWidth: 34, height: 170 };

export type DummyBehaviour = (dummy: Dummy, time: number, dt: number) => void;

export interface DummyConfig {
    /** world x; the dummy stands on whatever ground is there */
    x: number;
    /** plugin options for `add.skeleton`: starting clip, speed, facing, lit */
    options: SkeletonOptions;
    skin?: Skin;
    /** called every frame: the dummy's own party trick */
    behaviour?: DummyBehaviour;
    /** called once, after the dummy exists */
    setup?: (dummy: Dummy) => void;
}

/**
 * A character that does nothing but demonstrate one feature. They all share hero.json:
 * the same data drives any number of skeletons, each with its own skin, speed and pose.
 */
export class Dummy {
    readonly skeleton: Skeleton;
    private readonly hitbox = new Geom.Rectangle();
    private time = 0;

    constructor(
        readonly scene: Scene,
        terrain: Terrain,
        private readonly config: DummyConfig,
    ) {
        const groundY = terrain.groundYAt(config.x, 0, undefined, 0, 2000) ?? 560;
        this.skeleton = scene.add
            .skeleton(config.x, groundY, "hero", config.options)
            .setDepth(1);
        if (config.skin) this.skeleton.setSkin(config.skin);
        config.setup?.(this);
    }

    get x() {
        return this.skeleton.x;
    }

    get y() {
        return this.skeleton.y;
    }

    update(dt: number, targetX: number, targetY: number) {
        this.time += dt;

        // everyone keeps an eye on the hero: flip towards them and turn the head
        this.skeleton.faceTowards(targetX, 0.2, PLAYER.turnDeadZone);
        this.skeleton.aimBone("head", targetX, targetY - 90, {
            offset: PLAYER.headOffset,
            limit: PLAYER.headLimit,
        });

        this.config.behaviour?.(this, this.time, dt);
    }

    /**
     * Getting shot: an additive layer plays a bit of the slide clip on top of whatever the dummy is doing.
     * mode "add" = the layer's movement is added to the current pose instead of replacing it.
     */
    flinch() {
        this.skeleton.playLayer("hit", "slide", {
            mode: "add",
            weight: 0.3,
            loop: false,
            fade: 0.03,
            fadeOut: 0.25,
            restart: true,
        });
    }

    /** the box bullets are tested against */
    bounds(): Geom.Rectangle {
        return this.hitbox.setTo(
            this.x - HITBOX.halfWidth,
            this.y - HITBOX.height,
            HITBOX.halfWidth * 2,
            HITBOX.height,
        );
    }
}
