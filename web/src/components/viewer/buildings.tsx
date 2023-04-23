import { useEffect, useRef } from "react"
import { useStore } from "../../state/store.js"
import { BufferGeometryLoader, Group, Line, Mesh, MeshPhongMaterial, Points } from "three"

const loader = new BufferGeometryLoader()

export function Buildings() {
    const result = useStore((state) => state.result)
    const ref = useRef<Group>(null)
    useEffect(() => {
        const group = ref.current
        if (group == null) {
            return
        }
        for (const value of result) {
            if ("type" in value && value.type === "mesh") {
                const mesh = new Mesh(loader.parse(value.geometry), new MeshPhongMaterial())
                mesh.matrixAutoUpdate = false
                mesh.matrix.fromArray(value.matrix)
                group.add(mesh)
            }

            if ("type" in value && value.type === "point") {
                const points = new Points(loader.parse(value.geometry))
                points.matrixAutoUpdate = false
                points.matrix.fromArray(value.matrix)
                group.add(points)
            }

            if ("type" in value && value.type === "line") {
                const line = new Line(loader.parse(value.geometry))
                line.matrixAutoUpdate = false
                line.matrix.fromArray(value.matrix)
                group.add(line)
            }
        }
        return () => {
            group.clear()
        }
    }, [result])
    return <group ref={ref}></group>
}
