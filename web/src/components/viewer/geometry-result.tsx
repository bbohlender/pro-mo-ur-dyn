import { ColorRepresentation, KeyframeTrack, Mesh, MeshPhongMaterial, Object3D, Vector3Tuple } from "three"
import { useStore } from "../../state/store.js"

export function GeometryResult({
    type,
    color,
    position,
    result,
}: {
    type: string
    result: any
    color: ColorRepresentation
    position?: Vector3Tuple
}) {
    const geometry = result[type]
    if (geometry == null) {
        return null
    }
    return (
        <mesh position={position} geometry={geometry}>
            <meshPhongMaterial toneMapped={false} color={color} />
        </mesh>
    )
}

export function exportGeometryResult(
    objects: Array<Object3D>,
    tracks: Array<KeyframeTrack>,
    type: string,
    color: ColorRepresentation,
    position?: Vector3Tuple
) {
    const geometry = useStore.getState().result[type]
    if (geometry == null) {
        return
    }
    const mesh = new Mesh(geometry, new MeshPhongMaterial({ toneMapped: false, color }))
    if (position != null) {
        mesh.position.set(...position)
    }
    objects.push(mesh)
}
