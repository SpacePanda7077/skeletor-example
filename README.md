# skeletor-example

A playable tour of the **Skeletor** skeleton-animation plugin for Phaser 4. One character, one `hero.json`
exported from the editor, and as many plugin features as fit on one screen. The ground and the character's body
use Rapier, the control panel is React.

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # typecheck + production build in dist/
npm run lint
```

## Controls

| Input        | What happens                                                     |
| ------------ | ---------------------------------------------------------------- |
| `A` `D`      | run                                                              |
| `W` `Space`  | jump                                                             |
| `Shift`      | slide                                                            |
| Mouse        | the hero faces it, looks at it and aims the gun at it            |
| Click (hold) | shoot, the three dummies react when they are hit                 |
| `E`          | draw / holster the gun                                           |
| `F`          | lights on / off                                                  |
| `Q`          | debug draw (Rapier colliders and the foot-planting gizmos)       |
| `T`          | slow motion                                                      |

Everything except the movement keys is also in the panel next to the game.

## What shows what

| Plugin feature                                  | Where                                 |
| ----------------------------------------------- | ------------------------------------- |
| `load.skeleton`, `add.skeleton`, `SkeletonOptions` | `scenes/Boot.ts`, `scenes/Game.ts`, `entities/Dummy.ts` |
| `play` with crossfades, `faceTowards` with a turn time | `entities/Player.ts`            |
| `SkeletonEvents` (footstep dust, end of the slide) | `entities/Player.ts`               |
| `playLayer` with a bone mask ("run and gun")    | `entities/Player.ts`                  |
| `playLayer` with `mode: "add"` (hit reaction)   | `entities/Dummy.ts`                   |
| `plantBone`: feet on slopes, driven by a ray cast | `entities/Player.ts`, `world/Terrain.ts` |
| `aimBone`, `setBoneRotation` (head, recoil)     | `entities/Player.ts`, `entities/Dummy.ts` |
| `attachToBone`, `aimAttached`                   | `entities/Gun.ts`                     |
| `getIKTarget`, `getIKPole`, `bindIKTarget`, `setIKWeight` | `entities/Gun.ts`, `scenes/Game.ts` (the waving dummy) |
| `blend`                                         | `scenes/Game.ts` (the frost dummy)    |
| `setSkin`                                       | `skins.ts`                            |
| `setLit`, `setTimeScale`, `setPlantDebug`       | `scenes/Game.ts`                      |

## Project layout

```
src/
  skeletor/          the plugin (copy this folder into your own game)
  game/
    constants.ts     every tunable number: speeds, gun, terrain
    settings.ts      what the panel can switch, shared by React and Phaser
    scenes/          Boot (assets + Rapier init) and Game (wires everything together)
    entities/        Player, Gun, Dummy, Bullets
    world/Terrain.ts the ground: one Rapier collider, drawn as a filled shape, plus ray casts
    debug/           Rapier debug drawing
  ui/                React control panel
```

`Game.ts` owns the settings. The panel sends `settings-patch` events over the `EventBus` and the game answers with
`settings-changed`, so keyboard shortcuts and the panel always agree.

## Notes

- The character is authored with its feet at (0, 0), so the Rapier capsule is lifted by its own height and the
  skeleton sits exactly on the body's origin. That is what makes `plantBone`'s default ground level correct.
- Physics runs on a fixed 1/60 s step, so the game plays the same at any refresh rate.
- The skins are recolours painted onto canvas textures at start-up (`skins.ts`), so the example needs no extra art.
  With real alternative art you would just pass its texture keys to `setSkin`.
