import { useStore } from "../state/store.js"
import { PlayerControls } from "./player-controls.js"
import { ProceduralLine } from "./procedural-line.js"
import { TextEditor } from "./text-editor.js"
import { TextViewer } from "./text-viewer.js"
import { Toolbar } from "./toolbar.js"
import { EditHeader } from "./edit-header.js"
import { DeriveHeader } from "./derive-header.js"
import { MultiHeader } from "./multi-header.js"
import { Panel } from "./panel.js"
import { ArrowDownIcon, PlusIcon } from "@heroicons/react/20/solid"
import { serializeString } from "pro-3d-video"

export function Interface2D() {
    const mode = useStore((state) => state.mode)
    return (
        <div className="pointer-events-none z-20 gap-5 m-5 flex flex-col absolute inset-0">
            <div className="flex-1 min-h-0 gap-5 flex flex-row items-start justify-center">
                {mode === "view" && <Toolbar />}
                {mode === "edit" && <EditHeader />}
                {mode === "derive" && <DeriveHeader />}
                {mode === "multi" && <MultiHeader />}
                {mode === "view" && <div className="flex-grow" />}
                {mode === "view" && <Text />}
            </div>
            {mode != "multi" && <ProceduralLine />}
            <PlayerControls />
        </div>
    )
}

function Text() {
    const selectedDescriptionId = useStore((state) =>
        state.selectedDescriptionId != null && state.selectedDescriptionId in state.descriptions.descriptions
            ? state.selectedDescriptionId
            : undefined
    )
    const textEdit = useStore((state) => state.textEdit)
    const descriptions = useStore((state) => state.descriptions.descriptions)

    return (
        <Panel
            style={{ maxWidth: 340, minWidth: 340 }}
            className="items-end flex justify-between items-stretch flex-col text-ui relative h-full text-slate-950 bg-transparent flex-basis-0 flex-grow">
            <div className="flex flex-row border-b-2 w-full max-w-full items-center pt-1 pl-2">
                <div className="flex-row items-end flex-grow h-full overflow-x-auto flex">
                    {Object.entries(descriptions).map(([descriptionId, { identifier }]) => (
                        <a
                            key={descriptionId}
                            onClick={() => useStore.getState().selectDescription(descriptionId)}
                            className={`tab ${
                                descriptionId === selectedDescriptionId ? "tab-bordered tab-active" : ""
                            }`}>
                            {identifier}
                        </a>
                    ))}
                </div>
                <div className="btn-group my-1 mx-3 flex-shrink-0">
                    <button className="btn btn-primary btn-xs" onClick={downloadText}>
                        <ArrowDownIcon height={16} />
                    </button>
                    <div onClick={() => useStore.getState().addDescription()} className="btn btn-primary btn-xs">
                        <PlusIcon height={20} />
                    </div>
                </div>
            </div>
            {selectedDescriptionId != null ? (
                textEdit ? (
                    <TextEditor descriptionId={selectedDescriptionId} />
                ) : (
                    <TextViewer descriptionId={selectedDescriptionId} />
                )
            ) : (
                <div className="flex-grow"></div>
            )}
        </Panel>
    )
}

async function downloadText() {
    const text = serializeString(useStore.getState().descriptions)

    const a = document.createElement("a")
    a.href = window.URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    a.download = `scene.cgv`
    a.click()
}
