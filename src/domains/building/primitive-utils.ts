import { Box3, Matrix4, Quaternion, Vector3 } from "three"
import { makeTranslationMatrix } from "./math.js"
import { Primitive } from "./primitive.js"

const quaternionHelper = new Quaternion()

export type Axis = "x" | "y" | "z"
export function getValueOnAxis(vector: Vector3, axis: Axis): number {
    return vector[axis]
}

function setValueOnAxis(vector: Vector3, axis: Axis, value: number): void {
    vector[axis] = value
}

export function getDirection(matrix: Matrix4): "north" | "east" | "west" | "south" | "up" | "down" {
    quaternionHelper.setFromRotationMatrix(matrix)
    vectorHelper.set(0, 1, 0)
    vectorHelper.applyQuaternion(quaternionHelper)
    const x = Math.abs(vectorHelper.x)
    const y = Math.abs(vectorHelper.y)
    const z = Math.abs(vectorHelper.z)
    const max = Math.max(x, y, z)
    if (x === max) {
        return vectorHelper.x < 0 ? "west" : "east"
    }
    if (y === max) {
        return vectorHelper.y < 0 ? "down" : "up"
    }
    return vectorHelper.z < 0 ? "south" : "north"
}

const vectorHelper = new Vector3()

const boundingBox = new Box3()
const primitiveMin = new Vector3()

const box3Helper = new Box3()

export function Split(
    primitive: Primitive,
    axis: Axis,
    generatePrimitive: (matrix: Matrix4, index: number, x: number, y: number, z: number) => Primitive
): Array<Primitive> {
    primitive.getBoundingBox(boundingBox)
    primitiveMin.copy(boundingBox.min)
    let i = 0
    const generatedPrimitives: Array<Primitive> = []
    while (getValueOnAxis(boundingBox.min, axis) < getValueOnAxis(boundingBox.max, axis)) {
        const matrix = primitive.matrix.clone()
        matrix.multiply(makeTranslationMatrix(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z))
        const generatedPrimitive = generatePrimitive(
            matrix,
            i,
            boundingBox.max.x - boundingBox.min.x,
            boundingBox.max.y - boundingBox.min.y,
            boundingBox.max.z - boundingBox.min.z
        )
        generatedPrimitives.push(generatedPrimitive)
        generatedPrimitive.getBoundingBox(box3Helper)
        box3Helper.getSize(vectorHelper)
        i++
        setValueOnAxis(
            boundingBox.min,
            axis,
            getValueOnAxis(boundingBox.min, axis) + getValueOnAxis(vectorHelper, axis)
        )
    }
    return generatedPrimitives
}
