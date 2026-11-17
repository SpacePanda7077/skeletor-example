import * as Phaser from "phaser";
import RAPIER from "@dimforge/rapier2d-compat"; // or "@dimforge/rapier2d-deterministic-compat"

export type GroundDebugOptions = {
    /** pixels per Rapier meter */
    ppm?: number;
    /** the ground as a line in PIXELS, left to right. Default: flat, a slope down, flat again */
    ground?: [number, number][];
    /** false = don't make the ground (you already have your own colliders); it still draws + casts rays */
    createGround?: boolean;
    /** draw the ray that follows the mouse + a text box */
    mouseRay?: boolean;
    /** click drops a ball, R clears them */
    balls?: boolean;
};

/**
 * Debug helper for ground + rays. Not a scene: make one inside any scene that already has a Rapier world.
 *
 *   create():  this.dbg = new GroundDebug(this, this.world, { ppm: 100 });
 *   update():  this.world.step();  this.dbg.update();
 *   feet:      const y = this.dbg.groundYAt(footX, footY, this.playerBody);
 *   cleanup:   this.dbg.destroy();
 */
export class GroundDebug {
    readonly ppm: number;
    private gfx: Phaser.GameObjects.Graphics;
    private info: Phaser.GameObjects.Text | null = null;
    private balls: { body: RAPIER.RigidBody; radius: number }[] = [];
    private groundBody: RAPIER.RigidBody | null = null;
    private onDown: ((p: Phaser.Input.Pointer) => void) | null = null;
    private onKeyR: (() => void) | null = null;
    private opts: Required<Omit<GroundDebugOptions, "ground">> & {
        ground: [number, number][];
    };

    constructor(
        private scene: Phaser.Scene,
        private world: RAPIER.World,
        options: GroundDebugOptions = {},
    ) {
        this.opts = {
            ppm: 1,
            createGround: true,
            mouseRay: true,
            balls: true,
            ground: [
                [-600, 500], // flat ...
                [400, 500], // ... to here
                [800, 640], // ... then slopes down
                [1400, 640], // flat again
            ],
            ...options,
        } as GroundDebug["opts"];
        this.ppm = this.opts.ppm;

        this.gfx = scene.add.graphics().setDepth(10000);

        if (this.opts.createGround) this.makeGround();

        if (this.opts.mouseRay)
            this.info = scene.add
                .text(12, 12, "", {
                    fontFamily: "monospace",
                    fontSize: "14px",
                    color: "#ffffff",
                })
                .setScrollFactor(0)
                .setDepth(10001);

        if (this.opts.balls) {
            this.onDown = (p) => this.dropBall(p.worldX, p.worldY);
            this.onKeyR = () => this.clearBalls();
            scene.input.on("pointerdown", this.onDown);
            scene.input.keyboard?.on("keydown-R", this.onKeyR);
        }
    }

    /** one fixed body with a polyline collider (a line has no thickness: fine for rays and balls) */
    private makeGround() {
        const pts = this.opts.ground;
        const verts = new Float32Array(pts.length * 2);
        pts.forEach(([x, y], i) => {
            verts[i * 2] = x / this.ppm;
            verts[i * 2 + 1] = y / this.ppm;
        });
        this.groundBody = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.fixed(),
        );
        this.world.createCollider(
            RAPIER.ColliderDesc.polyline(verts),
            this.groundBody,
        );
    }

    dropBall(x: number, y: number, radius = 18) {
        const body = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic().setTranslation(
                x / this.ppm,
                y / this.ppm,
            ),
        );
        this.world.createCollider(
            RAPIER.ColliderDesc.ball(radius / this.ppm)
                .setRestitution(0.2)
                .setFriction(0.6),
            body,
        );
        this.balls.push({ body, radius });
    }

    clearBalls() {
        this.balls.forEach((b) => this.world.removeRigidBody(b.body));
        this.balls = [];
    }

    /**
     * World y (pixels) of the ground under x, or null if the ray finds nothing.
     * `fromY` is roughly where the foot is; the ray starts `up` pixels above it and looks `down` pixels below it.
     * Pass your player's rigid body as `ignore` so the ray doesn't hit yourself.
     */
    groundYAt(
        x: number,
        fromY: number,
        ignore?: RAPIER.RigidBody,
        up = 80,
        down = 300,
    ): number | null {
        const originY = fromY - up;
        const ray = new RAPIER.Ray(
            { x: x / this.ppm, y: originY / this.ppm },
            { x: 0, y: 1 },
        );
        const hit = this.world.castRay(
            ray,
            (up + down) / this.ppm,
            true,
            undefined,
            undefined,
            undefined,
            ignore,
        );
        if (!hit) return null;
        const h = hit as unknown as { timeOfImpact?: number; toi?: number };
        return originY + (h.timeOfImpact ?? h.toi ?? 0) * this.ppm;
    }

    /** draw everything; call it every frame after world.step() */
    update() {
        const g = this.gfx;
        const ppm = this.ppm;
        g.clear();

        // Rapier's own debug lines: exactly what the physics sees
        const { vertices, colors } = this.world.debugRender();
        for (let i = 0; i < vertices.length; i += 4) {
            const c = i * 2; // 4 floats of colour per vertex, 2 vertices per line
            g.lineStyle(
                2,
                Phaser.Display.Color.GetColor(
                    colors[c] * 255,
                    colors[c + 1] * 255,
                    colors[c + 2] * 255,
                ),
                1,
            );
            g.lineBetween(
                vertices[i] * ppm,
                vertices[i + 1] * ppm,
                vertices[i + 2] * ppm,
                vertices[i + 3] * ppm,
            );
        }

        g.lineStyle(2, 0x66ccff, 1);
        for (const b of this.balls) {
            const t = b.body.translation();
            g.strokeCircle(t.x * ppm, t.y * ppm, b.radius);
        }

        if (this.opts.mouseRay) {
            const p = this.scene.input.activePointer;
            const fromY = 350; // pretend the foot is here
            const hitY = this.groundYAt(p.worldX, fromY);
            const startY = fromY - 80;
            g.lineStyle(1, 0xffff00, 0.9);
            g.lineBetween(p.worldX, startY, p.worldX, hitY ?? startY + 380);
            g.fillStyle(0xff3b3b, 1);
            g.fillCircle(p.worldX, startY, 4); // ray origin
            if (hitY !== null) {
                g.fillStyle(0x00ff88, 1);
                g.fillCircle(p.worldX, hitY, 6); // hit point
            }
            this.info?.setText(
                [
                    `mouse x: ${p.worldX.toFixed(0)}`,
                    `ground y under it: ${hitY === null ? "no hit" : hitY.toFixed(1)}`,
                    `click = drop a ball, R = clear (${this.balls.length})`,
                ].join("\n"),
            );
        }
    }

    /** draw a foot ray you cast yourself (call after update() in the same frame) */
    drawRay(
        x: number,
        fromY: number,
        hitY: number | null,
        up = 80,
        color: number,
    ) {
        const g = this.gfx;
        g.lineStyle(1, color, 1);
        g.lineBetween(x, fromY - up, x, hitY ?? fromY + 200);
        if (hitY !== null) {
            g.fillStyle(0xff9900, 1);
            g.fillCircle(x, hitY, 5);
        }
    }

    destroy() {
        if (this.onDown) this.scene.input.off("pointerdown", this.onDown);
        if (this.onKeyR)
            this.scene.input.keyboard?.off("keydown-R", this.onKeyR);
        this.clearBalls();
        if (this.groundBody) this.world.removeRigidBody(this.groundBody);
        this.gfx.destroy();
        this.info?.destroy();
    }
}
