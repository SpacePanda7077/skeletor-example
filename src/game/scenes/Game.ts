import { Math as PMath, Scene } from "phaser";
import { EventBus } from "../EventBus";
import { GroundDebug } from "./GroundDebug";
import {
    Collider,
    ColliderDesc,
    RigidBodyDesc,
    World,
} from "@dimforge/rapier2d-compat";
import { RapierDebugDrawer } from "../Rapier-Debug";

export class Game extends Scene {
    hero: import("./skeletor-phaser").Skeleton;
    moving: Phaser.Input.Keyboard.Key | undefined;
    gun: Phaser.GameObjects.Container;
    facing = 1;
    r_handle: Phaser.GameObjects.Rectangle;
    world: World;
    dbg: GroundDebug;
    rigidBody: import("@dimforge/rapier2d-compat").RigidBody;
    rapdebug: RapierDebugDrawer;
    light: Phaser.GameObjects.Light;
    handVisual: Phaser.GameObjects.Rectangle;
    center: { x: number; y: number };
    constructor() {
        super("Game");
    }

    preload() {
        this.load.setPath("assets");

        this.load.image("star", "star.png");
        this.load.image("background", "bg.png");
        this.load.image("logo", "logo.png");
        this.load.skeleton("hero", "hero/hero.json");
    }

    create() {
        this.lights.enable().setAmbientColor(0x303030);
        this.light = this.lights.addLight(400, 500, 300);
        this.world = new World({ x: 0, y: 980 });
        this.rapdebug = new RapierDebugDrawer(this, this.world);
        this.hero = this.add.skeleton(300, 300, "hero", "idle");
        //this.hero.setSkin({ head: "logo" });
        const rbdecs = RigidBodyDesc.dynamic()
            .setTranslation(this.hero.x, this.hero.y)
            .lockRotations();
        this.rigidBody = this.world.createRigidBody(rbdecs);

        const coldesc = ColliderDesc.capsule(55, 30).setTranslation(0, -96);
        this.world.createCollider(coldesc, this.rigidBody);
        this.dbg = new GroundDebug(this, this.world);
        this.hero.setDepth(1);

        EventBus.emit("current-scene-ready", this);
        this.moving = this.input.keyboard?.addKey("k");
        const bone = this.hero.getBone("hand_R");

        console.log(this.hero.facing);
        this.gun = this.add.container(
            this.hero.x + bone!.tipX,
            this.hero.y + bone!.tipY - 20,
        );
        this.handVisual = this.add.rectangle(
            bone!.tipX,
            bone!.tipY,
            10,
            10,
            0xff0000,
        );

        this.center = {
            x: bone!.tipX,
            y: bone!.tipY - 20,
        };
        this.hero.add(this.handVisual);

        const sprite = this.add
            .rectangle(0, 0, 150, 30, 0xff0000)
            .setOrigin(0.1, 0.5);
        this.r_handle = this.add
            .rectangle(-10, 0, 20, 20, 0xfff000)
            .setOrigin(0.2, 0.5);

        this.gun.add([sprite, this.r_handle]);
        this.hero.attachToBone(this.gun, "hand_R", {
            below: "Arm-Right",
            at: "tip",
        });
        this.hero.setLit(true);

        this.input.keyboard?.on("keydown-J", () => {
            this.hero.playLayer("upper", "shoot", {
                bones: ["Arm_R", "Arm_L"],
                loop: false,
                fade: 0.12,
            }); // crossfade; safe to call every frame
        });
        this.input.keyboard?.on("keydown-K", () => {
            this.hero.play("idle", { loop: true, fade: 0.2 }); // crossfade; safe to call every frame
        });
        this.input.keyboard?.on("keydown-L", () => {
            this.hero.play("run", { loop: true, fade: 0.2 }); // crossfade; safe to call every frame
        });
        this.input.keyboard?.on("keydown-G", () => {
            this.hero.play("slide", { loop: false, fade: 0.2 }); // crossfade; safe to call every frame
        });
        this.hero.setPlantDebug(true); // false removes it
    }
    update(time: number, delta: number): void {
        const p = this.input.activePointer;
        const angle = PMath.Angle.Between(
            this.hero.x,
            this.hero.y,
            p.worldX,
            p.worldY,
        );

        this.light.setPosition(p.worldX, p.worldY);
        this.hero.faceTowards(p.worldX);
        // r_hand.setPosition(p.worldX, p.worldY);
        // this.hero.playLayer("upper", "idle", {
        //     bones: ["boby"],
        //     loop: false,
        // }); // crossfade; safe to call every frame
        // this.hero.aimBone("Bone 2", p.worldX, p.worldY, { limit: 1.2 }); // procedural aiming on top of the animation
        //this.hero.aimAttached(this.gun, p.worldX, p.worldY);
        this.hero.aimBone("head", p.worldX, p.worldY, {
            offset: PMath.DegToRad(-80),
            limit: PMath.DegToRad(45),
        });
        this.world.step();
        this.rapdebug.update();
        this.dbg.update();
        const ground = (x: number, y: number) =>
            this.dbg.groundYAt(x, y, this.rigidBody);

        const b = this.hero.plantBone("IK 1", { ground, bone: "Foot_L" });
        this.hero.plantBone("IK 2", { ground, bone: "Foot_R" });

        this.hero.setPosition(
            this.rigidBody.translation().x,
            this.rigidBody.translation().y,
        );
        this.rigidBody.setLinvel({ x: 500, y: 980 }, true);
        this.handVisual.setPosition(
            this.center.x + Math.cos(angle) * 10,
            this.center.y + Math.sin(angle) * 10,
        );
    }
}
