import { Panel } from "./panel.js"
import { PlayerControls } from "./player-controls.js"

export function Interface2D() {
    return (
        <div className="pointer-events-none z-20 gap-5 m-5 flex flex-col absolute inset-0">
            <div className="flex-1 gap-5 flex flex-row justify-between">
                <Panel>
                    <div className="flex flex-row p-5">Test123</div>
                </Panel>
                <Panel>
                    <div className="flex flex-row p-5">Test123</div>
                </Panel>
            </div>
            <PlayerControls />
        </div>
    )
}
