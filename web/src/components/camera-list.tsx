import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"
import { MotionEntity } from "pro-3d-video/motion"
import { CameraViewerState, ViewerState, useViewerState } from "./viewer/state.js"

export function CameraList() {
    const cameraIds = useStore((state) =>
        (state.result?.agents as Array<MotionEntity> | undefined)
            ?.filter((agent) => agent.type === "camera")
            .map((agent) => agent.id)
    )
    const selectedCameraId = useViewerState((state) =>
        state.viewType === "camera" ? (state as any as CameraViewerState).resultId : undefined
    )
    return (
        <div className="flex flex-col overflow-y-auto flex-shrink gap-3" style={{ maxWidth: "12rem" }}>
            {cameraIds?.map((cameraId) => {
                const selected = cameraId === selectedCameraId
                return (
                    <Panel
                        onClick={() => useViewerState.getState().enterResultCamera(cameraId)}
                        key={cameraId}
                        color={selected ? "rgba(30, 30, 220, 0.7)" : undefined}
                        className={`${selected ? "text-white" : ""} p-3 flex justify-between cursor-pointer`}>
                        <span>Camera</span>
                        <span className="font-bold">#{cameraId}</span>
                    </Panel>
                )
            })}
        </div>
    )
}
