import { useStore } from "../../src/state/store.js"
import { Panel } from "./panel.js"

export function Selection() {
    const keyframesAmount = useStore((state) => state.derivedSelection.keyframes.length)

    return (
        <Panel className="rounded gap-3 p-3 flex flex-row items-center">
            <div className="mr-2">
                Selected <span className="font-bold">{keyframesAmount}</span> Keyframes
            </div>
            <div onClick={() => useStore.getState().unselect()} className="btn btn-outline border-slate-300 btn-sm">
                Deselect
            </div>
            <div onClick={() => useStore.getState().delete()} className="btn btn-outline border-error btn-sm">
                Delete
            </div>
        </Panel>
    )
}
