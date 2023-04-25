import { KeyframeTrack, Mesh, MeshPhongMaterial, Object3D } from "three"

export function exportGLTF(result: any, objects: Array<Object3D>, tracks: Array<KeyframeTrack>): void {
    if (!("buildings" in result)) {
        return
    }
    objects.push(new Mesh(result.buildings, new MeshPhongMaterial({ color: "white", toneMapped: false })))
}
