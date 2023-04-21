import { ParsedDescriptions, flattenAST, NestedDescriptions, Value } from "pro-3d-video"
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
    result: Array<Value>
    interpretationFinished: boolean
}

const initialState: AppState = {
    descriptions: { descriptions: {}, nouns: {}, transformations: {} },
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
                descriptions: flattenAST(parsedResult),
            })
        },

        togglePlaying() {
            set({ playing: !get().playing })
        },

        replaceResult(result: Array<Value>, final: boolean) {
            let duration = 0

            for (const value of result) {
                if (isMotionEntity(value.raw)) {
                    duration = Math.max(duration, value.raw.keyframes[value.raw.keyframes.length - 1].t)
                }
            }

            set({ result, duration, time: clamp(get().time, 0, duration), interpretationFinished: final })
        },

        //TODO: appendResult(results: Array<Value>) {},

        setTime(time: number) {
            set({ time: clamp(time, 0, get().duration), playing: false })
        },
    }))
)
