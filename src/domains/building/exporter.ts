import { KeyframeTrack, Object3D } from "three"
import { isSerializedPrimitive, serializedPrimitiveToObject } from "./index.js"

export function exportGLTF(values: Array<unknown>, objects: Array<Object3D>, tracks: Array<KeyframeTrack>): void {
    const buildings = values.filter(isSerializedPrimitive)
    objects.push(...buildings.map((value, i) => serializedPrimitiveToObject(value)))
}
