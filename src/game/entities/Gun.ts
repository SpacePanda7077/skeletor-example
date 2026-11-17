import { GameObjects, Math as PMath, type Scene } from "phaser";
import type { BonePose, Skeleton } from "../../skeletor";
import { GUN } from "../constants";

export interface Muzzle {
    x: number;
    y: number;
    /** direction the barrel points in the world, radians */
    angle: number;
}

/** How fast the recoil kick dies away (per second). */
const RECOIL_DECAY = 14;
/** The elbows are pulled this far below the shoulders so they bend downwards. */
const ELBOW_DROP = 90;
/** The right hand never gets closer to the shoulder than this, or the arm folds up. */
const MIN_REACH = 30;

/**
 * A gun glued to the right hand. It shows four things the plugin can do together:
 *  - `attachToBone` + `aimAttached`: the gun follows the hand and swings towards the pointer, flipped or not
 *  - IK target / pole objects (`getIKTarget`, `getIKPole`): the right hand reaches towards the pointer
 *  - `bindIKTarget`: the left hand holds on to a point of the gun, wherever the gun goes
 *  - `setIKWeight`: holster / draw by fading the arm IK in and out
 */
export class Gun {
    /** 0..1, jumps to 1 when you fire and relaxes back to 0 */
    recoil = 0;

    private readonly container: GameObjects.Container;
    private readonly flash: GameObjects.Rectangle;
    private readonly rightTarget: GameObjects.GameObject & Pointlike;
    private readonly rightPole: GameObjects.GameObject & Pointlike;
    private readonly leftPole: GameObjects.GameObject & Pointlike;

    private readonly shoulder: BonePose = { x: 0, y: 0, rotation: 0, tipX: 0, tipY: 0 };
    private readonly matrix = new GameObjects.Components.TransformMatrix();
    private readonly parentMatrix = new GameObjects.Components.TransformMatrix();
    private readonly origin = { x: 0, y: 0 };
    private readonly tip = { x: 0, y: 0 };

    private cooldown = 0;
    private equipped = true;

    constructor(
        private readonly scene: Scene,
        private readonly hero: Skeleton,
    ) {
        const { container, flash, foregrip } = this.build(scene);
        this.container = container;
        this.flash = flash;

        // the gun sits at the tip of the hand bone, drawn just above the right hand sprite.
        // followRotation: false because aimAttached() decides where it points.
        hero.attachToBone(container, "hand_R", {
            at: "tip",
            above: "r-hand",
            followRotation: false,
        });

        // IK from the editor, driven by objects: move the target and the chain reaches for it
        this.rightTarget = hero.getIKTarget("IK 3");
        this.rightPole = hero.getIKPole("IK 3");
        hero.bindIKTarget("IK 4", foregrip);
        this.leftPole = hero.getIKPole("IK 4");
    }

    /** draw or holster the gun: the arms ease back to the animation, the gun disappears */
    setEquipped(on: boolean) {
        if (this.equipped === on) return;
        this.equipped = on;
        this.container.setVisible(on);
        for (const arm of ["IK 3", "IK 4"])
            this.hero.setIKWeight(arm, on ? 1 : 0, 0.25);
    }

    /** call once per frame with the aim point in world coordinates */
    update(dt: number, aimX: number, aimY: number) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.recoil *= Math.exp(-RECOIL_DECAY * dt);
        if (this.recoil < 0.01) this.recoil = 0;

        // the gun points at the pointer, whichever way the hero faces
        this.hero.aimAttached(this.container, aimX, aimY);

        // right hand: reach for the pointer, as far as the arm goes
        const shoulderR = this.hero.getBoneWorld("arm_R", this.shoulder);
        if (shoulderR) {
            const dx = aimX - shoulderR.x;
            const dy = aimY - shoulderR.y;
            const distance = Math.hypot(dx, dy) || 1;
            const reach = PMath.Clamp(distance, MIN_REACH, GUN.rightReach);
            this.rightTarget.setPosition(
                shoulderR.x + (dx / distance) * reach,
                shoulderR.y + (dy / distance) * reach,
            );
            this.rightPole.setPosition(shoulderR.x, shoulderR.y + ELBOW_DROP);
        }

        const shoulderL = this.hero.getBoneWorld("arm_L", this.shoulder);
        if (shoulderL)
            this.leftPole.setPosition(shoulderL.x, shoulderL.y + ELBOW_DROP);
    }

    /** fires if the gun is drawn and ready; returns where the bullet starts, or null */
    tryFire(): Muzzle | null {
        if (!this.equipped || this.cooldown > 0) return null;
        this.cooldown = GUN.fireDelay;
        this.recoil = 1;

        this.flash.setVisible(true);
        this.scene.time.delayedCall(50, () => this.flash.setVisible(false));
        return this.muzzle();
    }

    /** the end of the barrel in world coordinates (`getWorldTransformMatrix` includes the hero's flip) */
    private muzzle(): Muzzle {
        const m = this.container.getWorldTransformMatrix(
            this.matrix,
            this.parentMatrix,
        );
        m.transformPoint(0, 0, this.origin);
        m.transformPoint(GUN.length, 0, this.tip);
        return {
            x: this.tip.x,
            y: this.tip.y,
            angle: Math.atan2(this.tip.y - this.origin.y, this.tip.x - this.origin.x),
        };
    }

    /** The gun is drawn from plain rectangles: (0, 0) is the grip, the barrel points along +x. */
    private build(scene: Scene) {
        const body = scene.add.rectangle(GUN.length / 2 - 8, 0, GUN.length, 12, 0x2b2f36);
        const handle = scene.add.rectangle(-2, 13, 10, 20, 0x3a3f48);
        const barrel = scene.add.rectangle(GUN.length - 2, -2, 14, 6, 0x6b7280);
        const flash = scene.add
            .rectangle(GUN.length + 8, 0, 22, 10, 0xffe08a)
            .setVisible(false);

        // not drawn: just a spot on the gun for the left hand to hold
        const foregrip = new GameObjects.Zone(scene, GUN.foregripX, 4, 8, 8);

        const container = scene.add.container(0, 0, [
            body,
            handle,
            barrel,
            flash,
            foregrip,
        ]);
        return { container, flash, foregrip };
    }
}

type Pointlike = { setPosition(x?: number, y?: number): unknown };
