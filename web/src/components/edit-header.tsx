import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"

export function EditHeader() {
    const keyframesAmount = useStore((state) => state.derivedSelection.keyframes.length)
    const resultIds = useStore((state) => Array.from(state.derivedSelection.keyframeIndiciesMap.keys()))

    return (
        <Panel className="rounded gap-3 p-3 flex flex-row items-center">
            <div className="mr-2">
                Selected <span className="font-bold">{keyframesAmount}</span> Keyframes
            </div>
            <div onClick={() => useStore.getState().concretize()} className="btn btn-outline btn-primary btn-sm">
                Concretize
            </div>
            <div onClick={() => useStore.getState().deleteSelected()} className="btn btn-outline btn-error btn-sm">
                Delete
            </div>
            <div onClick={() => useStore.getState().exitEdit()} className="btn btn-outline border-slate-300 btn-sm">
                Exit
            </div>
            {resultIds.length === 1 && (
                <div
                    onClick={() => useStore.getState().follow(resultIds[0])}
                    className="btn btn-outline border-slate-300 btn-sm">
                    Follow
                </div>
            )}
        </Panel>
    )
}
