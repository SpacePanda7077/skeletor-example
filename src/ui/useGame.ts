import { useCallback, useEffect, useState } from "react";
import { EventBus, GameEvent } from "../game/EventBus";
import {
    DEFAULT_SETTINGS,
    type DemoSettings,
    type HudState,
} from "../game/settings";

/**
 * The React side of the EventBus: settings flow in both directions, the HUD only comes from the game.
 * The game owns the settings; `patch` just asks it to change them and waits for the echo.
 */
export function useGame() {
    const [settings, setSettings] = useState<DemoSettings>(DEFAULT_SETTINGS);
    const [hud, setHud] = useState<HudState | null>(null);

    useEffect(() => {
        EventBus.on(GameEvent.SettingsChanged, setSettings);
        EventBus.on(GameEvent.Hud, setHud);
        return () => {
            EventBus.off(GameEvent.SettingsChanged, setSettings);
            EventBus.off(GameEvent.Hud, setHud);
        };
    }, []);

    const patch = useCallback(
        (change: Partial<DemoSettings>) =>
            EventBus.emit(GameEvent.SettingsPatch, change),
        [],
    );

    return { settings, hud, patch };
}
