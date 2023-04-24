import { useEffect, useRef } from "react"
import { useStore } from "../../state/store.js"
import { Group } from "three"
import { isSerializedPrimitive, serializedPrimitiveToObject } from "pro-3d-video/building"

export function Buildings() {
    const result = useStore((state) => state.result)
    const ref = useRef<Group>(null)
    useEffect(() => {
        const group = ref.current
        if (group == null) {
            return
        }
        for (const value of result) {
            if (!isSerializedPrimitive(value)) {
                continue
            }
            group.add(serializedPrimitiveToObject(value))
        }
        return () => {
            group.clear()
        }
    }, [result])
    return <group ref={ref}></group>
}
