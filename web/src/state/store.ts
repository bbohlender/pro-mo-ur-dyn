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

const createZustand = create as any as typeof x.default

export type AppState = {
    descriptions: ParsedDescriptions
    time: number
    duration: number
    playing: boolean
    result: Array<any>
    interpretationFinished: boolean
}

const defaultDescription = parse(`Default (interprete: false) {
Building-->
    extrude( { 33%: 5 33%: 7 34%: 9 } )
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

        replaceResult(result: Array<any>, final: boolean) {
            let duration = 0

            for (const value of result) {
                if (isMotionEntity(value)) {
                    duration = Math.max(duration, value.keyframes[value.keyframes.length - 1].t)
                }
            }

            set({ result, duration, time: clamp(get().time, 0, duration), interpretationFinished: final })
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
