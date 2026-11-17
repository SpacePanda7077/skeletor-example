import {
    ColliderDesc,
    Ray,
    RigidBodyDesc,
    type RigidBody,
    type World,
} from "@dimforge/rapier2d-compat";
import { GameObjects, Math as PMath, type Scene } from "phaser";

export type Point = readonly [number, number];

/** A static ground made from a polyline: one Rapier collider, drawn as a filled shape. */
export class Terrain {
    constructor(
        scene: Scene,
        private readonly world: World,
        readonly points: readonly Point[],
    ) {
        this.createCollider();
        this.draw(scene);
    }

    /** First thing the segment (x0, y0) -> (x1, y1) hits, in pixels. Pass your own body as `ignore`. */
    raycast(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        ignore?: RigidBody,
    ): { x: number; y: number } | null {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.hypot(dx, dy);
        if (length === 0) return null;

        const ray = new Ray({ x: x0, y: y0 }, { x: dx / length, y: dy / length });
        const hit = this.world.castRay(
            ray,
            length,
            true,
            undefined,
            undefined,
            undefined,
            ignore,
        );
        if (!hit) return null;
        return {
            x: x0 + (dx / length) * hit.timeOfImpact,
            y: y0 + (dy / length) * hit.timeOfImpact,
        };
    }

    /**
     * World y of the ground under `x`, or null if there is none. This is the `ground` callback that
     * `Skeleton.plantBone` wants: the ray starts `up` px above `fromY` and looks `down` px below it.
     */
    groundYAt(
        x: number,
        fromY: number,
        ignore?: RigidBody,
        up = 80,
        down = 300,
    ): number | null {
        return (
            this.raycast(x, fromY - up, x, fromY + down, ignore)?.y ?? null
        );
    }

    private createCollider() {
        const vertices = new Float32Array(this.points.length * 2);
        this.points.forEach(([x, y], i) => {
            vertices[i * 2] = x;
            vertices[i * 2 + 1] = y;
        });
        const body = this.world.createRigidBody(RigidBodyDesc.fixed());
        this.world.createCollider(
            ColliderDesc.polyline(vertices).setFriction(1),
            body,
        );
    }

    private draw(scene: Scene) {
        const line = this.points.map(([x, y]) => new PMath.Vector2(x, y));
        const first = line[0];
        const last = line[line.length - 1];
        const floor = 2000;

        const shape = [new PMath.Vector2(first.x, floor), ...line, new PMath.Vector2(last.x, floor)];

        const gfx = new GameObjects.Graphics(scene).setDepth(0);
        gfx.fillStyle(0x1d2a22, 1).fillPoints(shape, true);
        gfx.lineStyle(4, 0x4ade80, 1).strokePoints(line, false);
        scene.add.existing(gfx);
    }
}
