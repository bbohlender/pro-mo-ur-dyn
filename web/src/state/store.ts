import {
    ParsedDescriptions,
    flattenAST,
    NestedDescriptions,
    Value,
    ParsedDescription,
    parse,
    nestAST,
} from "pro-3d-video"
//@ts-ignore
import create from "zustand"
import type x from "zustand"
import { combine } from "zustand/middleware"
import { clamp } from "three/src/math/MathUtils.js"
import { isMotionEntity } from "pro-3d-video/motion"
import { BufferGeometryLoader } from "three"

const createZustand = create as any as typeof x.default

export type AppState = {
    descriptions: ParsedDescriptions
    time: number
    duration: number
    playing: boolean
    result: any
    interpretationFinished: boolean
}

const loader = new BufferGeometryLoader()

const defaultDescription = parse(`Default (interprete: false) {
    Building--> this
}`)

const initialState: AppState = {
    descriptions: flattenAST(defaultDescription),
    time: 0,
    duration: 0,
    playing: true,
    result: [],
    interpretationFinished: true,
}

export const useStore = createZustand(
    combine(initialState, (set, get) => ({
        replaceDescriptions(parsedResult: NestedDescriptions): void {
            set({
                descriptions: flattenAST({ ...parsedResult, ...defaultDescription }),
            })
        },

        togglePlaying() {
            set({ playing: !get().playing })
        },

        replaceResult({ agents = [], building, footwalk, street }: any, final: boolean) {
            let duration = 0

            for (const value of agents) {
                duration = Math.max(duration, value.keyframes[value.keyframes.length - 1].t)
            }

            set({
                result: {
                    agents,
                    building: building == null ? undefined : loader.parse(building),
                    street: street == null ? undefined : loader.parse(street),
                    footwalk: footwalk == null ? undefined : loader.parse(footwalk),
                },
                duration,
                time: clamp(get().time, 0, duration),
                interpretationFinished: final,
            })
        },

        //TODO: appendResult(results: Array<Value>) {},

        addDescriptions(nestedDescriptions: NestedDescriptions) {
            set({
                descriptions: flattenAST({ ...nestedDescriptions, ...nestAST(get().descriptions, true) }),
            })
        },

        setTime(time: number) {
            set({ time: clamp(time, 0, get().duration), playing: false })
        },
    }))
)
