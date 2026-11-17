import { Geom, GameObjects, type Scene } from "phaser";
import { GUN, WORLD } from "../constants";
import { impactSparks } from "../effects";
import type { Terrain } from "../world/Terrain";
import type { Dummy } from "./Dummy";
import type { Muzzle } from "./Gun";

interface Bullet {
    shape: GameObjects.Rectangle;
    vx: number;
    vy: number;
}

/** Straight-flying bullets. Each frame the path they flew is ray cast against the ground and the dummies. */
export class Bullets {
    private readonly active: Bullet[] = [];
    private readonly path = new Geom.Line();

    constructor(
        private readonly scene: Scene,
        private readonly terrain: Terrain,
        private readonly targets: readonly Dummy[],
    ) {}

    spawn({ x, y, angle }: Muzzle) {
        const shape = this.scene.add
            .rectangle(x, y, 22, 4, 0xffe08a)
            .setRotation(angle)
            .setDepth(4);
        this.active.push({
            shape,
            vx: Math.cos(angle) * GUN.bulletSpeed,
            vy: Math.sin(angle) * GUN.bulletSpeed,
        });
    }

    update(dt: number) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const bullet = this.active[i];
            const { x, y } = bullet.shape;
            const nextX = x + bullet.vx * dt;
            const nextY = y + bullet.vy * dt;

            const hit = this.firstHit(x, y, nextX, nextY);
            if (hit) {
                impactSparks(this.scene, hit.x, hit.y);
                hit.target?.flinch();
            }

            const gone =
                hit || nextX < WORLD.minX || nextX > WORLD.maxX || nextY < WORLD.top || nextY > WORLD.bottom;
            if (gone) {
                bullet.shape.destroy();
                this.active.splice(i, 1);
            } else bullet.shape.setPosition(nextX, nextY);
        }
    }

    /** the closest thing the bullet's path crosses: a dummy (by its box) or the ground */
    private firstHit(x0: number, y0: number, x1: number, y1: number) {
        const ground = this.terrain.raycast(x0, y0, x1, y1);

        this.path.setTo(x0, y0, x1, y1);
        const target = this.targets.find((t) =>
            Geom.Intersects.LineToRectangle(this.path, t.bounds()),
        );
        if (!target) return ground && { ...ground, target: undefined };

        // a dummy standing behind a hill can't be shot through it
        const targetDistance = Math.hypot(target.x - x0, target.y - y0);
        const groundDistance = ground
            ? Math.hypot(ground.x - x0, ground.y - y0)
            : Infinity;
        return groundDistance < targetDistance
            ? { ...ground!, target: undefined }
            : { x: target.x, y: y1, target };
    }
}
