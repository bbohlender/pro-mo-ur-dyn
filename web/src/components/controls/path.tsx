import { Vector3Tuple } from "three"
import { getRawValue, useStore } from "../../state/store.js"
import { AxisEnabled, TransformControl } from "./transform-control.js"
import shallow from "zustand/shallow"
import { ParsedOperation } from "../../../../dist/index.js"

export function PathControl() {
    const astIds = useStore((state) => state.derivedSelection.astIds)
    return (
        <>
            {astIds.map((astId) => (
                <KeyframeControl astId={astId} key={astId} />
            ))}
        </>
    )
}

const axis2d: AxisEnabled = [true, false, true]

function KeyframeControl({ astId }: { astId: string }) {
    const value = useStore<Vector3Tuple | undefined>(({ descriptions: { transformations } }) => {
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

    if (value == null) {
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
