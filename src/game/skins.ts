import type { Scene } from "phaser";
import type { ExportData } from "../skeletor";
import type { SkinName } from "./settings";

/** part name -> texture key, the shape `Skeleton.setSkin` wants. null = the original art. */
export type Skin = Record<string, string> | null;

const TINTS: Record<Exclude<SkinName, "default">, string> = {
    ember: "#ff6a3d",
    frost: "#4cc9ff",
};

/**
 * `setSkin` swaps the picture of each part. Normally you would load alternative art; to keep this example
 * self-contained we paint a recoloured copy of every sprite onto a canvas texture instead.
 */
export function createSkins(
    scene: Scene,
    rig: ExportData,
): Record<SkinName, Skin> {
    const skins: Record<SkinName, Skin> = {
        default: null,
        ember: {},
        frost: {},
    };

    for (const [name, color] of Object.entries(TINTS) as [
        keyof typeof TINTS,
        string,
    ][]) {
        const skin: Record<string, string> = {};
        for (const part of rig.parts) {
            if (part.type !== "sprite" || !part.image) continue;
            const key = `${name}:${part.image}`;
            if (paintTintedCopy(scene, part.image, key, color))
                skin[part.name] = key;
        }
        skins[name] = skin;
    }
    return skins;
}

function paintTintedCopy(
    scene: Scene,
    sourceKey: string,
    key: string,
    color: string,
): boolean {
    if (scene.textures.exists(key)) return true;
    if (!scene.textures.exists(sourceKey)) return false;

    const image = scene.textures.get(sourceKey).getSourceImage() as
        | HTMLImageElement
        | HTMLCanvasElement;
    const texture = scene.textures.createCanvas(key, image.width, image.height);
    const ctx = texture?.getContext();
    if (!texture || !ctx) return false;

    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = "source-atop"; // only paint where the sprite has pixels
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, image.width, image.height);
    texture.refresh();
    return true;
}
