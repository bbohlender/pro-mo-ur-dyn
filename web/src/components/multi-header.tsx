import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"

export function MultiHeader() {
    return (
        <Panel className="rounded gap-3 p-3 flex flex-row items-center">
            <div onClick={() => useStore.getState().enterView()} className="btn btn-outline btn-error btn-sm">
                Exit
            </div>
        </Panel>
    )
}
