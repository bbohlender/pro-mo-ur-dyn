import { Panel } from "./panel.js"
import { PlayerControls } from "./player-controls.js"
import { ProceduralLine } from "./procedural-line.js"
import { TextEditor } from "./text-editor.js"
import { Toolbar } from "./toolbar.js"

export function Interface2D() {
    return (
        <div className="pointer-events-none z-20 gap-5 m-5 flex flex-col absolute inset-0">
            <div className="flex-1 gap-5 flex flex-row items-start justify-between">
                <Toolbar />
                <TextEditor />
            </div>
            {/*<ProceduralLine />*/}
            <PlayerControls />
        </div>
    )
}
