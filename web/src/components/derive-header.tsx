import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"

export function DeriveHeader() {
    const thresholdFootwalk = useStore((state) => state.deriveThresholdFootwalk)
    const thresholdStreet = useStore((state) => state.deriveThresholdStreet)
    return (
        <Panel className="rounded gap-3 p-3 flex flex-col">
            <div className="form-control flex-row items-center mr-5">
                <label className="label mr-3">
                    <span className="label-text">Threshold Street </span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={thresholdStreet}
                    onChange={(e) => useStore.getState().setDeriveThresholdStreet(e.target.valueAsNumber)}
                    className="range range-xs"
                />
            </div>

            <div className="form-control flex-row items-center mr-5">
                <label className="label mr-3">
                    <span className="label-text">Threshold Footwalk </span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={thresholdFootwalk}
                    onChange={(e) => useStore.getState().setDeriveThresholdFootwalk(e.target.valueAsNumber)}
                    className="range range-xs"
                />
            </div>

            <div className="flex flex-row justify-end gap-3">
                <div onClick={() => useStore.getState().enterView()} className="btn btn-outline btn-error btn-sm">
                    Cancel
                </div>

                <div
                    onClick={() => useStore.getState().confirmDeriveBuildingsAndPathways()}
                    className="btn btn-outline btn-success btn-sm">
                    Confirm
                </div>
            </div>
        </Panel>
    )
}
