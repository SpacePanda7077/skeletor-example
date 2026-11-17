import type { World } from "@dimforge/rapier2d-compat";
import { Display, GameObjects, type Scene } from "phaser";

/** Draws what Rapier sees (colliders, the ground polyline) on top of the game. Off unless asked for. */
export class DebugOverlay {
    private readonly gfx: GameObjects.Graphics;
    private enabled = false;

    constructor(
        scene: Scene,
        private readonly world: World,
    ) {
        this.gfx = scene.add.graphics().setDepth(1000).setVisible(false);
    }

    setEnabled(on: boolean) {
        this.enabled = on;
        this.gfx.setVisible(on);
        if (!on) this.gfx.clear();
    }

    /** call every frame after the physics step */
    update() {
        if (!this.enabled) return;

        const { vertices, colors } = this.world.debugRender();
        this.gfx.clear();
        for (let i = 0; i < vertices.length; i += 4) {
            const c = i * 2; // 4 colour floats per vertex, 2 vertices per line
            this.gfx.lineStyle(
                2,
                Display.Color.GetColor(
                    colors[c] * 255,
                    colors[c + 1] * 255,
                    colors[c + 2] * 255,
                ),
            );
            this.gfx.lineBetween(
                vertices[i],
                vertices[i + 1],
                vertices[i + 2],
                vertices[i + 3],
            );
        }
    }
}
