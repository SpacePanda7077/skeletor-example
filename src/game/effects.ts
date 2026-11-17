import type { Scene } from "phaser";

/** A few fading circles flying out from a point. Cheap stand-in for a particle emitter. */
function burst(
    scene: Scene,
    x: number,
    y: number,
    options: {
        count: number;
        color: number;
        radius: number;
        spread: number;
        rise: number;
        duration: number;
    },
) {
    for (let i = 0; i < options.count; i++) {
        const dot = scene.add
            .circle(x, y, options.radius * (0.6 + Math.random() * 0.8), options.color)
            .setDepth(5);
        const side = (Math.random() - 0.5) * 2;
        scene.tweens.add({
            targets: dot,
            x: x + side * options.spread,
            y: y - options.rise * (0.4 + Math.random() * 0.6),
            alpha: 0,
            scale: 0.2,
            duration: options.duration * (0.7 + Math.random() * 0.6),
            ease: "Cubic.easeOut",
            onComplete: () => dot.destroy(),
        });
    }
}

/** Dust kicked up by a footstep or a landing. */
export const dustPuff = (scene: Scene, x: number, y: number) =>
    burst(scene, x, y, {
        count: 4,
        color: 0xb8c4b0,
        radius: 5,
        spread: 28,
        rise: 22,
        duration: 380,
    });

/** Sparks where a bullet hits something. */
export const impactSparks = (scene: Scene, x: number, y: number) =>
    burst(scene, x, y, {
        count: 5,
        color: 0xffd166,
        radius: 2.5,
        spread: 24,
        rise: 30,
        duration: 260,
    });
