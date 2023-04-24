import { useEffect, useRef } from "react"
import { useStore } from "../../state/store.js"
import { Group } from "three"
import { isPathway, pathwaysToObject3ds } from "pro-3d-video/pathway"

export function Pathways() {
    const result = useStore((state) => state.result)
    const ref = useRef<Group>(null)
    useEffect(() => {
        const group = ref.current
        if (group == null) {
            return
        }
        group.add(...pathwaysToObject3ds(result.filter(isPathway)))
        return () => {
            group.clear()
        }
    }, [result])
    return <group ref={ref}></group>
}
