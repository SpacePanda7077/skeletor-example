import {
    ColliderDesc,
    RigidBodyDesc,
    type RigidBody,
    type World,
} from "@dimforge/rapier2d-compat";
import { Input, type Scene } from "phaser";
import {
    SkeletonEvents,
    type PlantOptions,
    type Skeleton,
} from "../../skeletor";
import { PLAYER } from "../constants";
import { dustPuff } from "../effects";
import type { DemoSettings, HudState } from "../settings";
import type { Terrain } from "../world/Terrain";
import { Gun, type Muzzle } from "./Gun";

type Locomotion = HudState["locomotion"];
type Key = Input.Keyboard.Key;

/** The animation clips in hero.json. */
const CLIP = { idle: "idle", run: "run", slide: "slide" } as const;

/** The IK chains in hero.json (name -> bone that touches the ground). */
const FEET = [
    { ik: "IK 1", bone: "foot_L" },
    { ik: "IK 2", bone: "foot_R" },
] as const;

/** How hard the torso kicks back when the gun fires, in radians. */
const RECOIL_KICK = 0.09;

/** Seconds after leaving the ground (a ledge, the crest of a hill) that you still count as standing. */
const COYOTE_TIME = 0.1;
/** Seconds after a jump before the ground check is trusted again, so the take-off isn't read as standing. */
const JUMP_LOCKOUT = 0.12;

/**
 * The hero: a Rapier capsule that moves, and a Skeleton that is drawn on top of it.
 * Every animation feature of the plugin that is not about the gun lives here.
 */
export class Player {
    readonly gun: Gun;
    private readonly body: RigidBody;
    private readonly keys: {
        left: Key[];
        right: Key[];
        jump: Key[];
        slide: Key[];
    };
    private readonly plantOptions: PlantOptions[];

    private locomotion: Locomotion = "idle";
    private grounded = false;
    private sinceGround = 0;
    private sinceJump = Infinity;
    private planting = false;
    private slideDir = 1;
    private slideTime = 0;
    private readonly slideDuration: number;

    constructor(
        private readonly scene: Scene,
        world: World,
        private readonly terrain: Terrain,
        readonly skeleton: Skeleton,
        private readonly settings: DemoSettings,
    ) {
        const { x, y } = PLAYER.spawn;
        const { halfHeight, radius } = PLAYER.capsule;

        // the body's origin is the hero's feet, so the capsule is lifted by its own height
        this.body = world.createRigidBody(
            RigidBodyDesc.dynamic()
                .setTranslation(x, y)
                .lockRotations()
                .setCcdEnabled(true),
        );
        world.createCollider(
            ColliderDesc.capsule(halfHeight, radius)
                .setTranslation(0, -(halfHeight + radius))
                .setFriction(1),
            this.body,
        );

        skeleton.setPosition(x, y).setDepth(2);
        this.gun = new Gun(scene, skeleton);

        this.keys = this.bindKeys();
        this.plantOptions = FEET.map(({ bone }) => ({
            // plantBone asks "where is the ground under this foot?": we answer with a ray cast
            ground: (gx, gy) => this.terrain.groundYAt(gx, gy, this.body),
            bone,
        }));
        this.slideDuration =
            skeleton.rigData.animations[CLIP.slide].duration /
            PLAYER.slideAnimSpeed;

        this.listenToAnimationEvents();
    }

    get x() {
        return this.skeleton.x;
    }

    get y() {
        return this.skeleton.y;
    }

    /** Reads the keyboard and sets the velocity. Call before stepping the physics. */
    preStep(dt: number) {
        this.updateGrounded(dt);
        const velocity = this.body.linvel();
        const direction =
            Number(this.pressed("right")) - Number(this.pressed("left"));

        let vx = direction * PLAYER.runSpeed;
        let vy = velocity.y;

        if (this.locomotion === "slide") {
            this.slideTime += dt;
            const left = Math.max(0, 1 - this.slideTime / this.slideDuration);
            vx = this.slideDir * PLAYER.slideSpeed * (0.35 + 0.65 * left);
        } else if (this.grounded && this.justPressed("slide")) {
            this.startSlide(
                direction || (this.skeleton.facing === "right" ? 1 : -1),
            );
            vx = this.slideDir * PLAYER.slideSpeed;
        }

        if (this.grounded && this.justPressed("jump")) {
            vy = -PLAYER.jumpSpeed;
            this.sinceJump = 0;
            this.sinceGround = COYOTE_TIME;
        }

        this.body.setLinvel({ x: vx, y: vy }, true);
    }

    /** Puts the skeleton on the body and updates every animation feature. Call after stepping the physics. */
    postStep(dt: number, aimX: number, aimY: number) {
        const { x, y } = this.body.translation();
        this.skeleton.setPosition(x, y);

        this.updateLocomotion(Math.abs(this.body.linvel().x) > 20);
        this.updateFacing(aimX);
        this.updateUpperBody();
        this.updateFeet();
        this.updateAim(dt, aimX, aimY);
    }

    /** Pull the trigger. Returns the bullet's starting point if the gun fired. */
    fire(): Muzzle | null {
        return this.locomotion === "slide" ? null : this.gun.tryFire();
    }

    hud(): HudState {
        const [left, right] = FEET.map(
            ({ ik }) => this.skeleton.getPlantInfo(ik)?.weight ?? 0,
        );
        return {
            locomotion: this.locomotion,
            grounded: this.grounded,
            facing: this.skeleton.facing,
            upperLayer: this.skeleton.isLayerPlaying("upper"),
            footPlant: { left, right },
        };
    }

    // ------------------------------------------------------------------------------------------ animation

    /** Picks the base animation. `play` is safe to call every frame: it only changes something when the clip changes. */
    private updateLocomotion(moving: boolean) {
        if (this.locomotion === "slide") return; // ends on the animation's COMPLETE event

        this.locomotion = !this.grounded ? "air" : moving ? "run" : "idle";
        this.skeleton.play(this.locomotion === "run" ? CLIP.run : CLIP.idle, {
            loop: true,
            fade: 0.15,
        });
    }

    /** The hero turns to face the pointer (a quick squash through the middle instead of a snap). */
    private updateFacing(aimX: number) {
        this.skeleton.faceTowards(aimX);
    }

    /**
     * Run and gun: while running, the spine and everything above it plays "idle" on top of the running legs.
     * Bones outside the mask keep playing the base animation.
     */
    private updateUpperBody() {
        const wanted = this.settings.runAndGun && this.locomotion === "run";
        const playing = this.skeleton.isLayerPlaying("upper");

        if (wanted && !playing)
            this.skeleton.playLayer("upper", CLIP.idle, {
                bones: ["spine"],
                priority: 1,
                fade: 0.15,
            });
        else if (!wanted && playing) this.skeleton.stopLayer("upper", 0.15);
    }

    /** Foot planting: the animated legs are bent by IK so the feet land on the terrain, slopes included. */
    private updateFeet() {
        const wanted =
            this.settings.footPlant &&
            this.grounded &&
            this.locomotion !== "slide";
        if (wanted === this.planting) return;
        this.planting = wanted;

        FEET.forEach(({ ik }, i) => {
            if (wanted) this.skeleton.plantBone(ik, this.plantOptions[i]);
            else this.skeleton.unplantBone(ik, 0.1);
        });
    }

    /** Procedural animation on top of the clips: the head follows the pointer, the torso kicks back on recoil. */
    private updateAim(dt: number, aimX: number, aimY: number) {
        this.skeleton.aimBone("head", aimX, aimY, {
            offset: PLAYER.headOffset,
            limit: PLAYER.headLimit,
        });

        this.gun.update(dt, aimX, aimY);

        if (this.gun.recoil > 0)
            this.skeleton.setBoneRotation(
                "spine",
                -RECOIL_KICK * this.gun.recoil,
                "add",
            );
        else this.skeleton.clearBoneOverride("spine");
    }

    private startSlide(direction: number) {
        this.locomotion = "slide";
        this.slideDir = direction;
        this.slideTime = 0;
        this.skeleton.play(CLIP.slide, {
            loop: false,
            fade: 0.08,
            speed: PLAYER.slideAnimSpeed,
            restart: true,
        });
    }

    /** Skeleton events: a footstep puff every time the run cycle wraps, and the end of the slide. */
    private listenToAnimationEvents() {
        this.skeleton.on(SkeletonEvents.LOOP, (name: string, slot?: string) => {
            if (name === CLIP.run && !slot)
                dustPuff(this.scene, this.x, this.y);
        });
        this.skeleton.on(
            SkeletonEvents.COMPLETE,
            (name: string, slot?: string) => {
                if (name === CLIP.slide && !slot) this.locomotion = "idle";
            },
        );
    }

    // ------------------------------------------------------------------------------------------ physics + input

    /** Ray cast under the feet, with a little grace so running over a crest doesn't flicker into "air". */
    private updateGrounded(dt: number) {
        this.sinceJump += dt;

        const { x, y } = this.body.translation();
        const ground = this.terrain.groundYAt(x, y, this.body, 12, 12);
        const touching =
            this.sinceJump > JUMP_LOCKOUT &&
            ground !== null &&
            ground - y <= PLAYER.groundedTolerance;

        this.sinceGround = touching ? 0 : this.sinceGround + dt;
        this.grounded = this.sinceGround < COYOTE_TIME;
    }

    private bindKeys() {
        const keyboard = this.scene.input.keyboard!;
        const keys = (...names: string[]) =>
            names.map((n) => keyboard.addKey(n));
        return {
            left: keys("A", "LEFT"),
            right: keys("D", "RIGHT"),
            jump: keys("W", "UP", "SPACE"),
            slide: keys("SHIFT"),
        };
    }

    private pressed(action: keyof Player["keys"]) {
        return this.keys[action].some((key) => key.isDown);
    }

    private justPressed(action: keyof Player["keys"]) {
        return this.keys[action].some((key) => Input.Keyboard.JustDown(key));
    }
}
