import type { DemoSettings, SkinName } from "../game/settings";
import { useGame } from "./useGame";

type Toggle = {
    key: keyof Pick<DemoSettings, "armed" | "runAndGun" | "footPlant" | "lights" | "debug">;
    label: string;
    /** the plugin call behind the switch */
    api: string;
    hotkey?: string;
};

const TOGGLES: Toggle[] = [
    { key: "armed", label: "Gun drawn", api: "attachToBone · aimAttached · setIKWeight", hotkey: "E" },
    { key: "runAndGun", label: "Run & gun", api: "playLayer({ bones: [\"spine\"] })" },
    { key: "footPlant", label: "Foot planting", api: "plantBone" },
    { key: "lights", label: "Lights", api: "setLit", hotkey: "F" },
    { key: "debug", label: "Debug draw", api: "setPlantDebug", hotkey: "Q" },
];

const SKINS: SkinName[] = ["default", "ember", "frost"];

const CONTROLS: [string, string][] = [
    ["A / D", "run"],
    ["W / Space", "jump"],
    ["Shift", "slide"],
    ["Mouse", "aim, face, look"],
    ["Click", "shoot (try the dummies)"],
    ["T", "slow motion"],
];

/** Controls hand the keyboard back to the game after a click, otherwise Space would press the focused checkbox. */
export function ControlPanel() {
    const { settings, hud, patch } = useGame();

    return (
        <aside className="panel">
            <h1>Skeletor</h1>
            <p className="sub">Phaser 4 skeleton plugin · feature tour</p>

            <section>
                <h2>Controls</h2>
                <dl className="keys">
                    {CONTROLS.map(([key, what]) => (
                        <div key={key}>
                            <dt>{key}</dt>
                            <dd>{what}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section>
                <h2>Features</h2>
                {TOGGLES.map(({ key, label, api, hotkey }) => (
                    <label key={key} className="toggle">
                        <input
                            type="checkbox"
                            checked={settings[key]}
                            onChange={(e) => {
                                patch({ [key]: e.target.checked });
                                e.currentTarget.blur();
                            }}
                        />
                        <span>
                            {label}
                            {hotkey && <kbd>{hotkey}</kbd>}
                            <code>{api}</code>
                        </span>
                    </label>
                ))}

                <label className="slider">
                    <span>
                        Time scale <b>{settings.timeScale.toFixed(2)}×</b>
                        <code>setTimeScale</code>
                    </span>
                    <input
                        type="range"
                        min={0.1}
                        max={1.5}
                        step={0.05}
                        value={settings.timeScale}
                        onChange={(e) => patch({ timeScale: Number(e.target.value) })}
                        onPointerUp={(e) => e.currentTarget.blur()}
                    />
                </label>

                <div className="skins">
                    <span>
                        Skin<code>setSkin</code>
                    </span>
                    <div>
                        {SKINS.map((skin) => (
                            <button
                                key={skin}
                                className={skin === settings.skin ? "button active" : "button"}
                                onClick={(e) => {
                                    patch({ skin });
                                    e.currentTarget.blur();
                                }}
                            >
                                {skin}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section>
                <h2>Live</h2>
                {hud ? (
                    <dl className="live">
                        <div><dt>state</dt><dd>{hud.locomotion}</dd></div>
                        <div><dt>grounded</dt><dd>{String(hud.grounded)}</dd></div>
                        <div><dt>facing</dt><dd>{hud.facing}</dd></div>
                        <div><dt>upper layer</dt><dd>{hud.upperLayer ? "idle" : "—"}</dd></div>
                        <div>
                            <dt>foot IK</dt>
                            <dd>
                                {hud.footPlant.left.toFixed(2)} / {hud.footPlant.right.toFixed(2)}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <p className="sub">loading…</p>
                )}
            </section>

            <section>
                <h2>Other dummies</h2>
                <ul className="notes">
                    <li><b>Ember</b> waves with a tweened IK target</li>
                    <li><b>Frost</b> mixes idle and run with <code>blend</code></li>
                    <li><b>Grey</b> starts at 0.4× via <code>SkeletonOptions</code></li>
                    <li>Shoot them: an additive layer plays the flinch</li>
                </ul>
            </section>
        </aside>
    );
}
