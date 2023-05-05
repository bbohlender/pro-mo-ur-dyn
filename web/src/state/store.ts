import {
    ParsedDescriptions,
    flattenAST,
    NestedDescriptions,
    parse,
    nestAST,
    WorkerInterface,
    ParsedTransformation,
} from "pro-3d-video"
import { Keyframe, MotionEntity } from "pro-3d-video/motion"
//@ts-ignore
import create from "zustand"
import type x from "zustand"
import { combine } from "zustand/middleware"
import { clamp, generateUUID } from "three/src/math/MathUtils.js"
import { BufferGeometryLoader } from "three"
//@ts-ignore
import Url from "./worker.js?url"

const createZustand = create as any as typeof x.default

export type DerivedSelectionState = {
    keyframes: Array<Keyframe>
    astIds: Array<string>
    keyframeIndiciesMap: Map<number, Array<Array<Keyframe>>>
}
export type PrimarySelectionState = {
    astIds?: Array<string>
    results?: Array<{ index: number; keyframeIndices?: Array<number> }>
}

export type AppState = {
    mode: "view" | "edit" | "derive" | "multi"
    confirmDerived?: () => Promise<void>
    deriveThreshold: number
    descriptions: ParsedDescriptions
    workerInterface: WorkerInterface
    time: number
    duration: number
    requestedDuration: number
    playing: boolean
    result: any
    interpretationFinished: boolean
    textEdit: boolean
    primarySelection: PrimarySelectionState
    derivedSelection: DerivedSelectionState
    shift: boolean
    controlling: boolean
}

const loader = new BufferGeometryLoader()

//TODO: only add when importing buildings and pathways
const defaultDescription = parse(`Default (interprete: false) {
    Building--> this
}`)

export const useStore = createZustand(
    combine(createInitialState(), (set, get) => ({
        setControlling(controlling: boolean) {
            set({ controlling })
        },

        updateDescriptions(descriptions: ParsedDescriptions, partial?: Partial<AppState>) {
            const requestedDuration = Math.max(get().time * 2, 10)
            get().workerInterface.terminate()
            set({
                descriptions,
                workerInterface: startWorkerInterface(descriptions, requestedDuration),
                requestedDuration,
                ...partial,
            } as any)
        },

        updatePrimarySelection(primarySelection: PrimarySelectionState, partial?: Partial<AppState>) {
            set({
                primarySelection,
                derivedSelection: computeDerivedSelection(primarySelection, get().result),
                mode: "edit",
                ...partial,
            } as any)
        },

        deleteType(...types: Array<string | undefined>): void {
            const { descriptions } = get()
            const newDescriptions: ParsedDescriptions["descriptions"] = {}
            for (const [id, description] of Object.entries(descriptions.descriptions)) {
                if (
                    description.initialVariables.interprete != false &&
                    types.includes(description.initialVariables.type)
                ) {
                    continue
                }
                newDescriptions[id] = description
            }
            this.updateDescriptions({
                transformations: descriptions.transformations,
                nouns: descriptions.nouns,
                descriptions: newDescriptions,
            })
        },

        finishTextEdit(parsedResult: NestedDescriptions): void {
            this.updateDescriptions(flattenAST(parsedResult), { textEdit: false })
        },

        editTransformations(...edits: Array<{ astId: string; transformation: ParsedTransformation }>) {
            const { descriptions } = get()
            const newTransformations = { ...descriptions.transformations }
            for (const { astId, transformation } of edits) {
                newTransformations[astId] = transformation
            }
            this.updateDescriptions({
                ...descriptions,
                transformations: newTransformations,
            })
        },
        deleteSelected(): void {
            const { descriptions, derivedSelection } = get()
            for (const transformation of Object.values(descriptions.transformations)) {
                if ("childrenIds" in transformation) {
                    transformation.childrenIds = transformation.childrenIds.filter(
                        (id) => derivedSelection.keyframes.findIndex((keyframe) => keyframe.astId === id) === -1
                    )
                }
            }
            this.updateDescriptions(descriptions, { primarySelection: { astIds: [], results: [] } })
        },
        exitEdit(): void {
            this.updatePrimarySelection({ astIds: [], results: [] }, { mode: "view" })
        },
        concretise(): void {
            //TODO
        },
        split(fromAstId: string, toAstId: string, percentage: number): void {
            const {
                descriptions: { transformations },
            } = get()
            const fromTransformation = transformations[fromAstId]
            const toTransformation = transformations[toAstId]

            if (
                fromTransformation.type === "operation" &&
                fromTransformation.identifier === "moveTo" &&
                toTransformation.type === "operation" &&
                toTransformation.identifier === "moveTo"
            ) {
                const x1 = getRawValue(transformations[fromTransformation.childrenIds[0]])
                const y1 = getRawValue(transformations[fromTransformation.childrenIds[1]])
                const z1 = getRawValue(transformations[fromTransformation.childrenIds[2]])
                const x2 = getRawValue(transformations[toTransformation.childrenIds[0]])
                const y2 = getRawValue(transformations[toTransformation.childrenIds[1]])
                const z2 = getRawValue(transformations[toTransformation.childrenIds[2]])

                const x1_5 = (x1 + x2) / 2
                const y1_5 = (y1 + y2) / 2
                const z1_5 = (z1 + z2) / 2

                const newToAstId = `t${generateUUID()}`
                const middleAstId = `t${generateUUID()}`
                const middleParamXAstId = `t${generateUUID()}`
                const middleParamYAstId = `t${generateUUID()}`
                const middleParamZAstId = `t${generateUUID()}`

                this.editTransformations(
                    {
                        astId: toAstId,
                        transformation: {
                            type: "sequential",
                            childrenIds: [middleAstId, newToAstId],
                        },
                    },
                    {
                        astId: newToAstId,
                        transformation: toTransformation,
                    },
                    {
                        astId: middleAstId,
                        transformation: {
                            type: "operation",
                            childrenIds: [middleParamXAstId, middleParamYAstId, middleParamZAstId],
                            identifier: "moveTo",
                        },
                    },
                    {
                        astId: middleParamXAstId,
                        transformation: {
                            type: "raw",
                            value: x1_5,
                        },
                    },
                    {
                        astId: middleParamYAstId,
                        transformation: {
                            type: "raw",
                            value: y1_5,
                        },
                    },
                    {
                        astId: middleParamZAstId,
                        transformation: {
                            type: "raw",
                            value: z1_5,
                        },
                    }
                )
            }
        },

        enterDeriveBuildingsAndPathways(): void {
            set({ mode: "derive" })
        },

        setDeriveThreshold(threshold: number): void {
            set({ deriveThreshold: threshold })
        },

        async confirmDeriveBuildingsAndPathways(): Promise<void> {
            await get().confirmDerived?.()
            set({ mode: "view" })
        },

        exitDeriveBuildingsAndPathways(): void {
            set({ mode: "view" })
        },

        select(primarySelection: PrimarySelectionState): void {
            const { shift, primarySelection: prevPrimarySelection } = get()
            if (shift) {
                this.updatePrimarySelection({
                    astIds: [...(prevPrimarySelection.astIds ?? []), ...(primarySelection.astIds ?? [])],
                    results: [...(prevPrimarySelection.results ?? []), ...(primarySelection.results ?? [])],
                })
            } else {
                this.updatePrimarySelection(primarySelection)
            }
        },

        beginTextEdit(): void {
            set({ textEdit: true })
        },

        togglePlaying() {
            set({ playing: !get().playing })
        },

        replaceResult({ agents = [], building, footwalk, street }: any, duration: number, final: boolean) {
            const result = {
                agents,
                building: building == null ? undefined : loader.parse(building),
                street: street == null ? undefined : loader.parse(street),
                footwalk: footwalk == null ? undefined : loader.parse(footwalk),
            }
            set({
                result,
                duration,
                interpretationFinished: final,
                derivedSelection: computeDerivedSelection(get().primarySelection, result),
            })
        },

        //TODOv2: appendResult(results: Array<Value>) {},

        addDescriptions(nestedDescriptions: NestedDescriptions) {
            this.updateDescriptions(flattenAST({ ...nestedDescriptions, ...nestAST(get().descriptions, true) }))
        },

        setTime(time: number) {
            set({ time: clamp(time, 0, get().duration), playing: false })
        },
    }))
)

export function getRawValue(transformation: ParsedTransformation): any {
    if (transformation.type != "raw") {
        throw new Error(`unexpected type "${transformation}" of transformation`)
    }
    return transformation.value
}

function computeDerivedSelection(
    { astIds: astIdsSelection, results: resultsSelection }: PrimarySelectionState,
    result: any
): DerivedSelectionState {
    const agents: Array<MotionEntity> | undefined = result.agents
    const keyframeSet = new Set<Keyframe>()
    const astIds = new Set<string>(astIdsSelection)
    const resultIndices = new Map<number, Array<Array<Keyframe>>>()
    for (let agentIndex = 0; agentIndex < (agents?.length ?? 0); agentIndex++) {
        const keyframes = agents![agentIndex].keyframes
        const resultSelection = resultsSelection?.filter(({ index }) => agentIndex === index)
        let currentKeyframes: Array<Keyframe> | undefined = undefined
        for (let keyframeIndex = 0; keyframeIndex < keyframes.length; keyframeIndex++) {
            const keyframe = keyframes[keyframeIndex]
            let isContained = false
            if (
                resultSelection?.find(
                    ({ keyframeIndices }) => keyframeIndices == null || keyframeIndices.includes(keyframeIndex)
                ) != null
            ) {
                keyframeSet.add(keyframe)
                astIds.add(keyframe.astId)
                isContained = true
            } else if (astIdsSelection?.includes(keyframe.astId)) {
                keyframeSet.add(keyframe)
                isContained = true
            }

            if (isContained) {
                if (currentKeyframes == null) {
                    currentKeyframes = []
                    setOrAdd(resultIndices, agentIndex, currentKeyframes)
                }
                currentKeyframes.push(keyframe)
            } else {
                currentKeyframes = undefined
            }
        }
    }
    return {
        keyframes: Array.from(keyframeSet),
        astIds: Array.from(astIds),
        keyframeIndiciesMap: resultIndices,
    }
}

function setOrAdd(map: Map<number, Array<Array<Keyframe>>>, key: number, value: Array<Keyframe>): void {
    const entry = map.get(key)
    if (entry == null) {
        map.set(key, [value])
        return
    }
    entry.push(value)
}

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
        mode: "view",
        descriptions,
        workerInterface: startWorkerInterface(descriptions, requestedDuration),
        deriveThreshold: 0.5,
        time: 0,
        duration: 0,
        playing: true,
        result: {},
        interpretationFinished: true,
        requestedDuration,
        textEdit: false,
        primarySelection: {},
        derivedSelection: { keyframes: [], astIds: [], keyframeIndiciesMap: new Map() },
        shift: false,
        controlling: false,
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
