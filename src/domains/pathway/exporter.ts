import { KeyframeTrack, Object3D } from "three"
import { pathwaysToObject3ds, isPathway } from "./index.js"

export function exportGLTF(values: Array<unknown>, objects: Array<Object3D>, tracks: Array<KeyframeTrack>): void {
    objects.push(...pathwaysToObject3ds(values.filter(isPathway)))
}
