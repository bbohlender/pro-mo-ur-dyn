import { useStore } from "../../state/store.js"
import { Euler, Quaternion, Vector3, Vector3Tuple } from "three"
import { GetState, SetState } from "zustand"
import create from "zustand"
import type x from "zustand"
import { combine } from "zustand/middleware"
import { MotionEntity, getEntityPositionAt, getEntityRotationAt, getKeyframeIndex } from "pro-3d-video/motion"
const createZustand = create as any as typeof x.default

export const FOV = 60

//the position representation in the state all refer to the single tile at zoom 0

export type SateliteViewerState = {
    viewType: "satelite"
    position: Vector3
}

export type FlyViewerState = {
    viewType: "fly"
    position: Vector3
    rotation: Euler
}

export type CameraViewerState = {
    viewType: "camera"
    resultId: string
}

export type ViewerState = SateliteViewerState | FlyViewerState | CameraViewerState

export type ResultViewerState = {
    error: string | undefined
}

export function eulerToTuple(q: Euler): Vector3Tuple {
    return [q.x, q.y, q.z]
}

const quaternionHelper = new Quaternion()

export const topRotation = new Euler(-Math.PI / 2, 0, 0, "YXZ")

export const rotateY180 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)

const MIN_Y_FLY_CAMERA = 0.1
const MIN_Y = 1 /*m*/
const DEFAULT_Y = 10 /*m*/
const MAX_Y = 400 /*m*/

const MIN_FOV = 5 //degree
const MAX_FOV = 120 //degree

export function createViewerStateInitial(): ViewerState {
    return {
        viewType: "satelite",
        position: new Vector3(0, DEFAULT_Y, 0),
    }
}

export function getForegroundOpacity(visualType: number): number {
    return Math.min(visualType * 2 - 1, 1)
}

export function getBackgroundOpacity(visualType: number): number {
    return Math.max(visualType * 2, 0)
}

export function clip(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max)
}

export function createViewerStateFunctions(set: SetState<ViewerState>, get: GetState<ViewerState>) {
    return {
        setLatLon: (lat: number, lon: number) => {
            set({
                viewType: "satelite",
                position: new Vector3(0, DEFAULT_Y, 0),
            })
        },
        drag: (xDrag: number, zDrag: number) => {
            const state = get()

            if (state.viewType === "camera") {
                return
            }

            const FOVinRadians = (calculateFOV(state) / 180) * Math.PI
            if (state.viewType == "satelite") {
                const fovSizeOnGround = 2 * Math.tan(FOVinRadians / 2) * state.position.y
                state.position.set(
                    state.position.x - xDrag * fovSizeOnGround,
                    state.position.y,
                    state.position.z - zDrag * fovSizeOnGround
                )
            } else {
                state.rotation.x = clip(state.rotation.x + zDrag * FOVinRadians, -Math.PI / 2, Math.PI / 2)
                state.rotation.y += xDrag * FOVinRadians
            }
        },
        moveFlyCamera: (by: Vector3Tuple) => {
            const state = get()
            if (state.viewType !== "fly") {
                return
            }
            computeFlyCameraPosition(state.position, by, state.rotation)
        },
        pinch: (by: number) => {
            const state = get()
            switch (state.viewType) {
                case "satelite":
                    state.position.y = clip(state.position.y / by, MIN_Y, MAX_Y)
                    break
                case "fly":
                    computeFlyCameraPosition(state.position, [0, 0, (1 - by) * 0.000001], state.rotation)
                    break
            }
        },
        enterResultCamera(id: string) {
            set({ viewType: "camera", resultId: id })
        },
        enterFlyCamera: () => {
            const state = get()
            if (state.viewType === "fly") {
                return
            }
            const position = new Vector3()
            calculateTransformation(state, position, quaternionHelper)
            set({
                viewType: "fly",
                position,
                rotation: new Euler().setFromQuaternion(quaternionHelper, "YXZ"),
            })
        },
        enterSateliteView: () => {
            const state = get()
            if (state.viewType === "satelite") {
                return
            }
            const position = new Vector3()
            calculateTransformation(state, position, quaternionHelper)
            position.y = clip(position.y, MIN_Y, MAX_Y)
            set({
                viewType: "satelite",
                position,
            })
        },
    }
}

function computeFlyCameraPosition(position: Vector3, move: Vector3Tuple, rotation: Euler): void {
    const { x, y, z } = position
    position.set(...move)
    position.applyEuler(rotation)
    position.x += x
    position.y += y
    position.z += z
    position.y = clip(position.y, MIN_Y_FLY_CAMERA, MAX_Y)
}

export type ViewerStateFunctions = ReturnType<typeof createViewerStateFunctions>

export const useViewerState = createZustand(combine(createViewerStateInitial(), createViewerStateFunctions))

export function calculateTransformation(state: ViewerState, positionTarget: Vector3, rotationTarget: Quaternion): void {
    if (state.viewType === "fly") {
        rotationTarget.setFromEuler(state.rotation)
        positionTarget.copy(state.position)
        return
    }
    if (state.viewType === "satelite") {
        rotationTarget.setFromEuler(topRotation)
        positionTarget.copy(state.position)
        return
    }
    const globalState = useStore.getState()
    const camera = (globalState.result.agents as Array<MotionEntity> | undefined)?.find(
        (agent) => agent.id === state.resultId
    )

    if (camera == null) {
        return
    }

    const index = getKeyframeIndex(camera.keyframes, globalState.time, 0)

    if (index == null) {
        return
    }

    getEntityPositionAt(camera.keyframes, globalState.time, index, positionTarget)
    getEntityRotationAt(camera.keyframes, globalState.time, index, rotationTarget)
    rotationTarget.multiply(rotateY180)
    return
}

export function calculateFOV(state: ViewerState): number {
    return FOV
}
