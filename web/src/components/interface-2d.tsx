import { useStore } from "../state/store.js"
import { PlayerControls } from "./player-controls.js"
import { ProceduralLine } from "./procedural-line.js"
import { TextEditor } from "./text-editor.js"
import { TextViewer } from "./text-viewer.js"
import { Toolbar } from "./toolbar.js"
import { EditHeader } from "./edit-header.js"
import { DeriveHeader } from "./derive-header.js"

export function Interface2D() {
    const textEdit = useStore((state) => state.textEdit)
    const mode = useStore((state) => state.mode)
    return (
        <div className="pointer-events-none z-20 gap-5 m-5 flex flex-col absolute inset-0">
            <div className="flex-1 min-h-0 gap-5 flex flex-row items-start justify-center">
                {mode === "view" && <Toolbar />}
                {mode === "edit" && <EditHeader />}
                {mode === "derive" && <DeriveHeader />}
                {mode === "view" && <div className="flex-grow"/>}
                {mode === "view" && (textEdit ? <TextEditor /> : <TextViewer />)}
            </div>
            <ProceduralLine />
            <PlayerControls />
        </div>
    )
}
