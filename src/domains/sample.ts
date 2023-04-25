import { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Triangle, Vector3 } from "three"

export function getTriangle(
    faceIndex: number,
    positionAttribute: BufferAttribute | InterleavedBufferAttribute,
    target: Triangle
): Triangle {
    target.a.fromBufferAttribute(positionAttribute, faceIndex * 3)
    target.b.fromBufferAttribute(positionAttribute, faceIndex * 3 + 1)
    target.c.fromBufferAttribute(positionAttribute, faceIndex * 3 + 2)
    return target
}

export function sampleTriangle(triangle: Triangle, targetPosition: Vector3): Vector3 {
    let u = Math.random()
    let v = Math.random()

    if (u + v > 1) {
        u = 1 - u
        v = 1 - v
    }

    targetPosition
        .set(0, 0, 0)
        .addScaledVector(triangle.a, u)
        .addScaledVector(triangle.b, v)
        .addScaledVector(triangle.c, 1 - (u + v))

    return targetPosition
}

const _triangle = new Triangle()

export function sampleGeometry(geometry: BufferGeometry, amount: number): Array<Vector3> {
    if (geometry.index != null) {
        geometry = geometry.toNonIndexed()
    }
    const positionAttribute = geometry.getAttribute("position") as BufferAttribute | InterleavedBufferAttribute
    const areas = new Array(positionAttribute.count / 3)
        .fill(null)
        .map((_, i) => nanToZero(getTriangle(i, positionAttribute, _triangle).getArea()))
    
    const amounts = distributeOverSizes(areas, amount)
    const result: Array<Vector3> = []
    for (let index = 0; index < amounts.length; index++) {
        const amountAtIndex = amounts[index]
        if (amountAtIndex == null) {
            continue
        }
        getTriangle(index, positionAttribute, _triangle)
        for (let i = 0; i < amountAtIndex; i++) {
            result.push(sampleTriangle(_triangle, new Vector3()))
        }
    }
    return result
}

export function distributeOverSizes(sizes: Array<number>, amount: number): Array<number | undefined> {
    const sumSize = sizes.reduce((prev, size) => prev + size, 0)
    const amounts: Array<number | undefined> = []
    for (let i = 0; i < amount; i++) {
        const index = randomIndexBySize(sizes, sumSize)
        amounts[index] = (amounts[index] ?? 0) + 1
    }
    return amounts
}

function nanToZero(value: number): number {
    return isNaN(value) ? 0 : value
}

function randomIndexBySize(sizes: Array<number>, sum: number): number {
    let acc = 0
    const random = Math.random() * sum
    for (let i = 0; i < sizes.length; i++) {
        acc += sizes[i]
        if (random <= acc) {
            return i
        }
    }
    return sizes.length - 1
}
