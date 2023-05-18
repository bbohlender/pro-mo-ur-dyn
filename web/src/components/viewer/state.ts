import { Euler, Vector3, Vector3Tuple } from "three"
import { GetState, SetState } from "zustand"
import create from "zustand"
import type x from "zustand"
import { combine } from "zustand/middleware"
const createZustand = create as any as typeof x.default

export const FOV = 60

//the position representation in the state all refer to the single tile at zoom 0

export type SateliteViewerState = {
    viewType: "satelite"
    position: Vector3Tuple
}

export type FlyViewerState = {
    viewType: "fly"
    position: Vector3Tuple
    rotation: Vector3Tuple
}

export type ViewerState = SateliteViewerState | FlyViewerState

export type ResultViewerState = {
    error: string | undefined
}

export function eulerToTuple(q: Euler): Vector3Tuple {
    return [q.x, q.y, q.z]
}

const euler = new Euler(0, 0, 0, "YXZ")
const panoramaRotation: Vector3Tuple = [0, 0, 0]

export const topRotation = eulerToTuple(new Euler(-Math.PI / 2, 0, 0))

const MIN_Y_FLY_CAMERA = 0.1
const MIN_Y = 1 /*m*/
const DEFAULT_Y = 10 /*m*/
const MAX_Y = 400 /*m*/

const MIN_FOV = 5 //degree
const MAX_FOV = 120 //degree

export function createViewerStateInitial(): ViewerState {
    return {
        viewType: "satelite",
        position: [0, DEFAULT_Y, 0],
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
                position: [0, DEFAULT_Y, 0],
            })
        },
        drag: (xDrag: number, zDrag: number) => {
            const state = get()
            const FOVinRadians = (calculateFOV(state) / 180) * Math.PI
            if (state.viewType == "satelite") {
                const [x, y, z] = state.position
                const fovSizeOnGround = 2 * Math.tan(FOVinRadians / 2) * state.position[1]
                set({
                    position: [x - xDrag * fovSizeOnGround, y, z - zDrag * fovSizeOnGround],
                })
            } else {
                euler.set(...state.rotation)
                euler.x = clip(euler.x + zDrag * FOVinRadians, -Math.PI / 2, Math.PI / 2)
                euler.y += xDrag * FOVinRadians
                set({
                    rotation: [euler.x, euler.y, euler.z],
                } as FlyViewerState)
            }
        },
        moveFlyCamera: (by: Vector3Tuple) => {
            const state = get()
            if (state.viewType !== "fly") {
                return
            }
            set({
                position: computeFlyCameraPosition(state.position, by, state.rotation),
            })
        },
        pinch: (by: number) => {
            const state = get()
            switch (state.viewType) {
                case "satelite":
                    {
                        const [x, y, z] = state.position
                        set({
                            position: [x, clip(y / by, MIN_Y, MAX_Y), z],
                        })
                    }
                    break
                case "fly": {
                    set({
                        position: computeFlyCameraPosition(state.position, [0, 0, (1 - by) * 0.000001], state.rotation),
                    })
                }
            }
        },
        enterFlyCamera: () => {
            const state = get()
            if (state.viewType === "fly") {
                return
            }
            const position = getPosition(state)
            const rotation = calculateRotation(state)
            set({
                viewType: "fly",
                position,
                rotation,
            })
        },
        backToSateliteView: () => {
            const state = get()
            if (state.viewType === "satelite") {
                return
            }
            const [x, y, z] = getPosition(state)
            set({
                viewType: "satelite",
                position: [x, clip(y, MIN_Y, MAX_Y), z],
            })
        },
        toggleView() {
            if (get().viewType === "fly") {
                this.backToSateliteView()
            } else {
                this.enterFlyCamera()
            }
        },
    }
}

const helperVector = new Vector3()
const helperEuler = new Euler(undefined, undefined, undefined, "YXZ")

function computeFlyCameraPosition([x, y, z]: Vector3Tuple, move: Vector3Tuple, rotation: Vector3Tuple): Vector3Tuple {
    helperVector.set(...move)
    helperEuler.set(...rotation)
    helperVector.applyEuler(helperEuler)
    helperVector.x += x
    helperVector.y += y
    helperVector.z += z
    helperVector.y = clip(helperVector.y, MIN_Y_FLY_CAMERA, MAX_Y)
    return helperVector.toArray()
}

export type ViewerStateFunctions = ReturnType<typeof createViewerStateFunctions>

export const useViewerState = createZustand(combine(createViewerStateInitial(), createViewerStateFunctions))

export function getPosition(state: ViewerState): Vector3Tuple {
    return state.position
}

export function calculateRotation(state: ViewerState): Vector3Tuple {
    if (state.viewType === "satelite") {
        return topRotation
    }
    return state.rotation
}

export function calculateFOV(state: ViewerState): number {
    return FOV
}
