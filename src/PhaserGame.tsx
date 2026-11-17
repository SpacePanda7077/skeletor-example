import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import type { Game, Scene } from "phaser";
import { EventBus, GameEvent } from "./game/EventBus";
import StartGame from "./game/main";

export interface IRefPhaserGame {
    game: Game | null;
    scene: Scene | null;
}

interface IProps {
    currentActiveScene?: (scene: Scene) => void;
}

/** Creates the Phaser game once and exposes the game and the latest active scene through the ref. */
export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
    function PhaserGame({ currentActiveScene }, ref) {
        const game = useRef<Game | null>(null);

        const publish = (scene: Scene | null) => {
            const value = { game: game.current, scene };
            if (typeof ref === "function") ref(value);
            else if (ref) ref.current = value;
        };

        useLayoutEffect(() => {
            if (game.current === null) {
                game.current = StartGame("game-container");
                publish(null);
            }

            return () => {
                game.current?.destroy(true);
                game.current = null;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [ref]);

        useEffect(() => {
            const onSceneReady = (scene: Scene) => {
                currentActiveScene?.(scene);
                publish(scene);
            };
            EventBus.on(GameEvent.SceneReady, onSceneReady);
            return () => {
                EventBus.off(GameEvent.SceneReady, onSceneReady);
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [currentActiveScene, ref]);

        return <div id="game-container" />;
    },
);
