export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

/** Everything is simulated in pixels (1 Rapier unit = 1 px), see `lengthUnit` in Game.ts. */
export const PHYSICS = {
    gravity: 1800,
    /** fixed simulation step, so the game plays the same on 60 Hz and 144 Hz screens */
    step: 1 / 60,
    /** longest frame we simulate in one go (tab was in the background, etc.) */
    maxFrame: 0.1,
};

export const PLAYER = {
    spawn: { x: 220, y: 400 },
    runSpeed: 320,
    jumpSpeed: 760,
    slideSpeed: 560,
    /** slide clip is 5 frames long; slowing it down makes the slide last long enough to feel good */
    slideAnimSpeed: 0.55,
    /** capsule that stands on the skeleton's origin: the rig is authored with its feet at (0, 0) */
    capsule: { halfHeight: 55, radius: 30 },
    /** pixels above the feet that still count as "standing on the ground" */
    groundedTolerance: 6,
    /** pointer must be this far (px) from the hero before it flips to face it */
    turnDeadZone: 24,
    turnSeconds: 0.12,
    /** head looks at the pointer, but never further than this (radians) */
    headLimit: Math.PI / 4,
    /** the head bone points up in the rig, so aiming needs this much extra rotation */
    headOffset: -Math.PI * (80 / 180),
};

export const GUN = {
    length: 64,
    /** where the left hand grabs the gun, measured from the grip along the barrel */
    foregripX: 20,
    /** the right arm can't reach further than this from the shoulder (upper arm + forearm) */
    rightReach: 54,
    fireDelay: 0.14,
    bulletSpeed: 1500,
};

/**
 * The ground as a polyline in pixels, left to right.
 * Flat, a gentle slope, a plateau, a hill and a drop: enough to show off foot planting.
 */
export const TERRAIN_POINTS: readonly (readonly [number, number])[] = [
    [-400, 560],
    [600, 560],
    [900, 640],
    [1300, 640],
    [1500, 590],
    [1700, 590],
    [1800, 560],
    [2000, 560],
    [2150, 490],
    [2300, 560],
    [2700, 560],
    [2900, 620],
    [3400, 620],
];

export const WORLD = {
    minX: -400,
    maxX: 3400,
    top: -400,
    bottom: GAME_HEIGHT + 400,
};
