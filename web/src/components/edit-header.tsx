import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"

export function EditHeader() {
    const keyframesAmount = useStore((state) => state.derivedSelection.keyframes.length)

    return (
        <Panel className="rounded gap-3 p-3 flex flex-row items-center">
            <div className="mr-2">
                Selected <span className="font-bold">{keyframesAmount}</span> Keyframes
            </div>
            <div onClick={() => useStore.getState().deleteSelected()} className="btn btn-outline btn-error btn-sm">
                Delete
            </div>
            <div onClick={() => useStore.getState().exitEdit()} className="btn btn-outline border-slate-300 btn-sm">
                Exit
            </div>
        </Panel>
    )
}
