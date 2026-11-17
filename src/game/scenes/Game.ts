import { World } from "@dimforge/rapier2d-compat";
import { type GameObjects, Scene } from "phaser";
import {
    GAME_HEIGHT,
    GAME_WIDTH,
    PHYSICS,
    TERRAIN_POINTS,
    WORLD,
} from "../constants";
import { DebugOverlay } from "../debug/DebugOverlay";
import { Bullets } from "../entities/Bullets";
import { Dummy } from "../entities/Dummy";
import { Player } from "../entities/Player";
import { EventBus, GameEvent } from "../EventBus";
import { DEFAULT_SETTINGS, type DemoSettings } from "../settings";
import { createSkins, type Skin } from "../skins";
import { Terrain } from "../world/Terrain";

/** How often the panel gets fresh numbers (seconds). */
const HUD_INTERVAL = 0.1;

export class Game extends Scene {
    private world: World;
    private terrain: Terrain;
    private player: Player;
    private dummies: Dummy[] = [];
    private bullets: Bullets;
    private overlay: DebugOverlay;
    private light: GameObjects.Light;
    private skins: Record<string, Skin>;

    private settings: DemoSettings = { ...DEFAULT_SETTINGS };
    private accumulator = 0;
    private hudTimer = 0;

    constructor() {
        super("Game");
    }

    create() {
        this.createWorld();
        this.createPlayer();
        this.createDummies();
        this.bullets = new Bullets(this, this.terrain, this.dummies);
        this.createCamera();
        this.connectToReact();

        this.applySettings();
        EventBus.emit(GameEvent.SceneReady, this);
    }

    update(_time: number, deltaMs: number) {
        const frame = Math.min(deltaMs / 1000, PHYSICS.maxFrame);
        const dt = frame * this.settings.timeScale;

        // the pointer's world position changes when the camera moves, even if the mouse doesn't
        const pointer = this.input.activePointer;
        pointer.updateWorldPoint(this.cameras.main);

        this.player.preStep(dt);
        this.stepPhysics(dt);
        this.player.postStep(dt, pointer.worldX, pointer.worldY);

        if (pointer.isDown) {
            const muzzle = this.player.fire();
            if (muzzle) this.bullets.spawn(muzzle);
        }

        for (const dummy of this.dummies)
            dummy.update(dt, this.player.x, this.player.y);
        this.bullets.update(dt);

        this.light.setPosition(pointer.worldX, pointer.worldY);
        this.overlay.update();
        this.sendHud(frame);
    }

    // ------------------------------------------------------------------------------------------ setup

    private createWorld() {
        this.add
            .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "background")
            .setScrollFactor(0)
            .setDepth(-10)
            .setTint(0x8a93a8);

        this.world = new World({ x: 0, y: PHYSICS.gravity });
        this.world.timestep = PHYSICS.step;
        // the world is measured in pixels, not metres: tell Rapier how big a "unit" is
        this.world.integrationParameters.lengthUnit = 100;

        this.terrain = new Terrain(this, this.world, TERRAIN_POINTS);
        this.overlay = new DebugOverlay(this, this.world);

        this.lights.enable().setAmbientColor(0x707070);
        this.light = this.lights.addLight(0, 0, 320, 0xffffff, 2);
    }

    private createPlayer() {
        const hero = this.add.skeleton(0, 0, "hero", {
            animation: "idle",
            lit: true,
        });
        this.skins = createSkins(this, hero.rigData);
        this.player = new Player(this, this.world, this.terrain, hero, this.settings);
    }

    /** Three more characters from the same hero.json, each showing a different part of the plugin. */
    private createDummies() {
        // 1. A hand driven by a tween: IK target objects can be moved like any game object
        this.dummies.push(
            new Dummy(this, this.terrain, {
                x: 1100,
                options: { animation: "idle", lit: true },
                skin: this.skins.ember,
                setup: ({ skeleton, scene }) => {
                    const hand = skeleton.getIKTarget("IK 3");
                    scene.tweens.add({
                        targets: hand,
                        y: hand.y - 110,
                        x: hand.x + 25,
                        duration: 450,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut",
                    });
                },
            }),
        );

        // 2. blend(): idle and run mixed by weight, here swinging back and forth
        this.dummies.push(
            new Dummy(this, this.terrain, {
                x: 1900,
                options: { animation: "idle", facing: "left", lit: true },
                skin: this.skins.frost,
                behaviour: ({ skeleton }, time) => {
                    const run = (Math.sin(time * 1.4) + 1) / 2;
                    skeleton.blend({ idle: 1 - run, run });
                },
            }),
        );

        // 3. SkeletonOptions: slow motion from the start, drawn in the default skin
        this.dummies.push(
            new Dummy(this, this.terrain, {
                x: 2550,
                options: { animation: "idle", speed: 0.4, lit: true },
            }),
        );
    }

    private createCamera() {
        const camera = this.cameras.main;
        camera.setBounds(
            WORLD.minX,
            WORLD.top,
            WORLD.maxX - WORLD.minX,
            WORLD.bottom - WORLD.top,
        );
        camera.startFollow(this.player.skeleton, true, 0.12, 0.12);
    }

    // ------------------------------------------------------------------------------------------ physics

    /** Fixed timestep: the simulation advances in equal steps however long a frame took. */
    private stepPhysics(dt: number) {
        this.accumulator += dt;
        while (this.accumulator >= PHYSICS.step) {
            this.world.step();
            this.accumulator -= PHYSICS.step;
        }
    }

    // ------------------------------------------------------------------------------------------ settings + React

    private connectToReact() {
        const onPatch = (patch: Partial<DemoSettings>) => this.patchSettings(patch);
        EventBus.on(GameEvent.SettingsPatch, onPatch);

        // the scene can end by shutting down or by the whole game being destroyed (React unmounting)
        let cleaned = false;
        const cleanUp = () => {
            if (cleaned) return;
            cleaned = true;
            EventBus.off(GameEvent.SettingsPatch, onPatch);
            this.world.free();
        };
        this.events.once("shutdown", cleanUp);
        this.events.once("destroy", cleanUp);

        // keys that flip the same switches as the panel
        const toggle = (key: string, name: "armed" | "debug" | "lights") =>
            this.input.keyboard?.on(`keydown-${key}`, () =>
                this.patchSettings({ [name]: !this.settings[name] }),
            );
        toggle("E", "armed");
        toggle("F", "lights");
        toggle("Q", "debug");
        this.input.keyboard?.on("keydown-T", () =>
            this.patchSettings({ timeScale: this.settings.timeScale === 1 ? 0.25 : 1 }),
        );
    }

    private patchSettings(patch: Partial<DemoSettings>) {
        Object.assign(this.settings, patch);
        this.applySettings();
    }

    /** Pushes the settings into the plugin. Settings that are read every frame (footPlant, runAndGun) need nothing here. */
    private applySettings() {
        const { armed, lights, debug, timeScale, skin } = this.settings;
        const { skeleton, gun } = this.player;

        gun.setEquipped(armed);
        skeleton.setLit(lights);
        skeleton.setTimeScale(timeScale);
        skeleton.setSkin(this.skins[skin]);
        skeleton.setPlantDebug(debug);
        this.overlay.setEnabled(debug);

        for (const dummy of this.dummies) {
            dummy.skeleton.setLit(lights);
            dummy.skeleton.setTimeScale(timeScale);
        }

        EventBus.emit(GameEvent.SettingsChanged, { ...this.settings });
    }

    private sendHud(frame: number) {
        this.hudTimer += frame;
        if (this.hudTimer < HUD_INTERVAL) return;
        this.hudTimer = 0;
        EventBus.emit(GameEvent.Hud, this.player.hud());
    }
}
