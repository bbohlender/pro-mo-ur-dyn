import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"

export function DeriveHeader() {
    const threshold = useStore((state) => state.deriveThreshold)
    return (
        <Panel className="rounded gap-3 p-3 flex flex-row items-center">
            <div className="form-control flex-row items-center mr-5">
                <label className="label mr-3">
                    <span className="label-text">Threshold </span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => useStore.getState().setDeriveThreshold(e.target.valueAsNumber)}
                    className="range range-xs"
                />
            </div>

            <div
                onClick={() => useStore.getState().exitDeriveBuildingsAndPathways()}
                className="btn btn-outline btn-error btn-sm">
                Cancel
            </div>

            <div
                onClick={() => useStore.getState().confirmDeriveBuildingsAndPathways()}
                className="btn btn-outline btn-success btn-sm">
                Confirm
            </div>
        </Panel>
    )
}
