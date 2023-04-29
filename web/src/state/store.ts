import { ParsedDescriptions, flattenAST, NestedDescriptions, parse, nestAST, WorkerInterface } from "pro-3d-video"
//@ts-ignore
import create from "zustand"
import type x from "zustand"
import { combine } from "zustand/middleware"
import { clamp } from "three/src/math/MathUtils.js"
import { BufferGeometryLoader } from "three"
//@ts-ignore
import Url from "./worker.js?url"

const createZustand = create as any as typeof x.default

export type AppState = {
    descriptions: ParsedDescriptions
    workerInterface: WorkerInterface
    time: number
    duration: number
    requestedDuration: number
    playing: boolean
    result: any
    interpretationFinished: boolean
    showAgentPaths: boolean
}

const loader = new BufferGeometryLoader()

const defaultDescription = parse(`Default (interprete: false) {
    Building--> this
}`)

export const useStore = createZustand(
    combine(createInitialState(), (set, get) => ({
        updateDescriptions(descriptions: ParsedDescriptions) {
            const requestedDuration = Math.max(get().time * 2, 10)
            get().workerInterface.terminate()
            set({
                descriptions,
                workerInterface: startWorkerInterface(descriptions, requestedDuration),
                requestedDuration,
            })
        },

        replaceDescriptions(parsedResult: NestedDescriptions): void {
            this.updateDescriptions(flattenAST({ ...parsedResult, ...defaultDescription }))
        },

        togglePlaying() {
            set({ playing: !get().playing })
        },

        setShowAgentPaths(showAgentPaths: boolean) {
            set({ showAgentPaths })
        },

        replaceResult({ agents = [], building, footwalk, street }: any, duration: number, final: boolean) {
            set({
                result: {
                    agents,
                    building: building == null ? undefined : loader.parse(building),
                    street: street == null ? undefined : loader.parse(street),
                    footwalk: footwalk == null ? undefined : loader.parse(footwalk),
                },
                duration,
                interpretationFinished: final,
            })
        },

        //TODO: appendResult(results: Array<Value>) {},

        addDescriptions(nestedDescriptions: NestedDescriptions) {
            this.updateDescriptions(flattenAST({ ...nestedDescriptions, ...nestAST(get().descriptions, true) }))
        },

        setTime(time: number) {
            set({ time: clamp(time, 0, get().duration), playing: false })
        },
    }))
)

export function updateTime(delta: number) {
    const state = useStore.getState()

    if (state.playing && state.time < state.duration) {
        state.time = state.duration === 0 ? 0 : state.time + delta
        if (state.interpretationFinished) {
            state.time %= state.duration
        }
    }

    //more than 80% of the timeline is played
    if (!state.interpretationFinished && state.time > state.requestedDuration * 0.8) {
        state.requestedDuration = state.requestedDuration * 2
        state.workerInterface.updateRequestedProgress(state.requestedDuration)
    }
}

function createInitialState(): AppState {
    const descriptions = flattenAST(defaultDescription)
    const requestedDuration = 10
    return {
        descriptions,
        workerInterface: startWorkerInterface(descriptions, requestedDuration),
        time: 0,
        duration: 0,
        playing: true,
        result: {},
        interpretationFinished: true,
        showAgentPaths: false,
        requestedDuration,
    }
}

function startWorkerInterface(descriptions: ParsedDescriptions, requestedDuration: number): WorkerInterface {
    const workerInterface = new WorkerInterface(
        Url,
        {
            name: "worker",
            type: "module",
        },
        (result, progress, isFinal) => useStore.getState().replaceResult(result, progress, isFinal)
    )
    workerInterface.interprete(nestAST(descriptions, true), requestedDuration)
    return workerInterface
}
