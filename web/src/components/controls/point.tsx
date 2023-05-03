import { Matrix4 } from "three"
import { AxisEnabled, TransformControl } from "./transform-control.js"
import { useStore } from "src/state/store.js"
import shallow from "zustand/shallow"

const axis2d: AxisEnabled = [true, false, true]

const identitiyMatrix = new Matrix4()

export function Point2Control({
    astId,
    parameterIndex,
    x,
    z,
}: {
    astId: string
    parameterIndex: number
    x: number
    z: number
}) {
    /*const [x, z] = useStore((state) => {
        const transformation = state.descriptions.transformations[astId]
        if (transformation == null || !("childrenIds" in transformation)) {
            return [0, 0]
        }
        return transformation.childrenIds.slice(parameterIndex, parameterIndex + 2).map((id) => {
            const parameter = state.descriptions.transformations[id]
            if (parameter.type != "raw") {
                return 0
            }
            return parameter.value
        })
    }, shallow as any)*/

    return (
        <TransformControl
            value={[x, 0, z]}
            axis={axis2d}
            matrix={identitiyMatrix}
            mode="translate"
            set={(x, y, z) => {
                //TODO
            }}
        />
    )
}
