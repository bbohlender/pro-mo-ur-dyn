import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import { BufferGeometry, Material, Mesh } from "three"

export function useModel(url: string): {
    entitiyGeometry: BufferGeometry
    entityMaterial: Material
    planeGeometry: BufferGeometry
} {
    const gltf = useGLTF(url)
    return useMemo(() => {
        const entityMesh = gltf.scene.getObjectByName("Entity") as Mesh<BufferGeometry, Material>
        const planeMesh = gltf.scene.getObjectByName("Plane") as Mesh<BufferGeometry, Material>
        return {
            entitiyGeometry: entityMesh.geometry,
            entityMaterial: entityMesh.material,
            planeGeometry: planeMesh.geometry,
        }
    }, [gltf])
}
