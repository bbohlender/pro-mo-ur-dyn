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

const initialState: AppState = {
    descriptions: flattenAST(
        parse(`Default (interprete: false) {
    Building-->
        extrude( 6.41 ) ->
        toFaces( ) ->
        if
            direction( ) == "north" || direction( ) == "east" || direction( ) == "south" || direction( ) == "west"
        then {
            split(
                "x",
                false,
                5.86
            ) ->
            if this.index == 0 then {
                split(
                    "z",
                    false,
                    2.25
                ) ->
                if this.index == 1 then {
                    split(
                        "x",
                        false,
                        0.7,
                        0.89,
                        1.12,
                        0.85,
                        1.04,
                        0.85
                    ) ->
                    if
                        this.index % 2 == 1
                    then {
                        split(
                            "z",
                            false,
                            0.47,
                            0.69,
                            0.73,
                            0.69,
                            0.65,
                            0.72
                        ) ->
                        if
                            this.index % 2 == 1
                        then { Window } else { this }
                    } else {
                        this
                    }
                } else {
                    split(
                        "x",
                        false,
                        0.68,
                        0.89,
                        1.12,
                        0.61,
                        0.48,
                        0.5,
                        0.55,
                        0.61
                    ) ->
                    if
                        this.index == 1 || this.index == 3 || this.index == 7
                    then {
                        split(
                            "z",
                            false,
                            1.17,
                            0.73
                        ) ->
                        if this.index == 1 then { Window } else { this }
                    } else {
                        if this.index == 5 then {
                            split(
                                "z",
                                false,
                                0.25,
                                1.05,
                                0.23,
                                0.39
                            ) ->
                            if this.index == 3 then {
                                Window
                            } else {
                                if this.index == 1 then { Door } else { this }
                            }
                        } else {
                            this
                        }
                    }
                }
            } else {
                split(
                    "x",
                    false,
                    0.39,
                    1.39
                ) ->
                if this.index == 1 then {
                    split(
                        "z",
                        false,
                        0.69,
                        0.13,
                        1.17,
                        0.24,
                        0.1,
                        1.18,
                        0.16,
                        0.13,
                        1.03,
                        0.22,
                        0.16,
                        1
                    ) ->
                    if
                        this.index % 3 == 1
                    then {
                        extrude( 0.6 ) ->
                        toFaces( ) ->
                        if this.index == 1 then {
                            extrude( 0.45 )
                        } else {
                            this
                        }
                    } else {
                        if
                            this.index % 3 == 2
                        then {
                            split(
                                "x",
                                false,
                                0.31,
                                0.89
                            ) ->
                            if this.index == 1 then { Door } else { this }
                        } else {
                            this
                        }
                    }
                } else {
                    this
                }
            }
        } else {
            extrude( 1.21 ) ->
            gableRoof( -6 )
        }

    Window-->
        extrude( -0.18 )

    Door -->
        extrude( -0.07 )
}`)
    ),
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
