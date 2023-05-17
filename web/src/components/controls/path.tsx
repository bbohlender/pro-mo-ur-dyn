import { Vector3Tuple } from "three"
import { getRawValue, useStore } from "../../state/store.js"
import { AxisEnabled, TransformControl } from "./transform-control.js"
import shallow from "zustand/shallow"
import { ParsedOperation } from "../../../../dist/index.js"
import { Fragment, useEffect, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { getKeyframeIndex } from "../../../../dist/domains/motion/helper.js"

export function PathControl() {
    const keyframeIndiciesMap = useStore((state) => state.derivedSelection.keyframeIndiciesMap)

    return (
        <>
            {Array.from(keyframeIndiciesMap.keys()).map((resultId) => (
                <Fragment key={resultId}>
                    {keyframeIndiciesMap.get(resultId)?.map((_, index) => (
                        <Fragment key={index}>
                            <KeyframeControl resultId={resultId} index={index} keyframeOffset={0} />
                            <KeyframeControl resultId={resultId} index={index} keyframeOffset={1} />
                        </Fragment>
                    ))}
                </Fragment>
            ))}
        </>
    )
}

const axis2d: AxisEnabled = [true, false, true]

function computeAstId(resultId: string, index: number, keyframeOffset: number): string | undefined {
    const state = useStore.getState()
    const keyframes = state.derivedSelection.keyframeIndiciesMap.get(resultId)?.[index]
    if (keyframes == null) {
        return undefined
    }
    const keyframeIndex = getKeyframeIndex(keyframes, state.time, 0)
    if (keyframeIndex == null) {
        return undefined
    }
    const offsettedKeyframeIndex = keyframeIndex + keyframeOffset
    if (offsettedKeyframeIndex < 0 || offsettedKeyframeIndex >= keyframes.length) {
        return undefined
    }
    return keyframes[offsettedKeyframeIndex].astId
}

function KeyframeControl({
    resultId,
    index,
    keyframeOffset,
}: {
    resultId: string
    index: number
    keyframeOffset: number
}) {
    const [astId, setAstId] = useState<string | undefined>(() => computeAstId(resultId, index, keyframeOffset))

    useFrame(() => setAstId(computeAstId(resultId, index, keyframeOffset)))

    const value = useStore<Vector3Tuple | undefined>(({ descriptions: { transformations } }) => {
        if (astId == null) {
            return undefined
        }
        const transformation = transformations[astId]
        if (transformation == null || transformation.type != "operation" || transformation.identifier != "moveTo") {
            return undefined
        }
        return [
            getRawValue(transformations[transformation.childrenIds[0]]),
            0,
            getRawValue(transformations[transformation.childrenIds[2]]),
        ]
    }, shallow as any)

    if (value == null || astId == null) {
        return null
    }

    return (
        <TransformControl
            value={value}
            axis={axis2d}
            mode="translate"
            set={(x, y, z) => {
                const {
                    descriptions: { transformations },
                } = useStore.getState()
                const transformation = transformations[astId] as ParsedOperation
                const [astId1, , astId2] = transformation.childrenIds
                useStore.getState().editTransformations(
                    {
                        astId: astId1,
                        transformation: {
                            type: "raw",
                            value: x,
                        },
                    },
                    {
                        astId: astId2,
                        transformation: {
                            type: "raw",
                            value: z,
                        },
                    }
                )
            }}
        />
    )
}
