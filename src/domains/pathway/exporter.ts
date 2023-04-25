import { KeyframeTrack, Mesh, MeshPhongMaterial, Object3D } from "three"

export function exportGLTF(result: any, objects: Array<Object3D>, tracks: Array<KeyframeTrack>): void {
    if (!("pathways" in result)) {
        return
    }
    objects.push(new Mesh(result.pathways, new MeshPhongMaterial({ toneMapped: false, color: "gray" })))
}
