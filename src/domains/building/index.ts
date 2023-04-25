import {
    BackSide,
    Box3,
    BufferGeometry,
    BufferGeometryLoader,
    Line,
    Matrix4,
    Mesh,
    MeshPhongMaterial,
    Object3D,
    Points,
    Shape,
    ShapeUtils,
    Vector2,
    Vector3,
} from "three"
import * as THREE from "three"
import { FacePrimitive, PointPrimitive, Primitive } from "./primitive.js"
//import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
//import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { computeGableRoof } from "./roof.js"
import { Axis, getDirection, Split } from "./primitive-utils.js"
import { OperationNextCallback, Operations } from "../../index.js"
import { makeRotationMatrix, makeScaleMatrix, makeTranslationMatrix } from "./math.js"
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

THREE.Cache.enabled = true

//const gltfLoader = new GLTFLoader()
//const dracoLoader = new DRACOLoader()
//dracoLoader.setDecoderPath("/cgv/")
//gltfLoader.setDRACOLoader(dracoLoader)

//function computeLoad(instance: Primitive, url: string) {
//    return from(gltfLoader.loadAsync(url)).pipe(map((gltf) => [new ObjectPrimitive(instance.matrix, gltf.scene)]))
//}

//function computePoint3(instance: Primitive, x: number, y: number, z: number): Observable<Array<Primitive>> {
//    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
//    return of([new PointPrimitive(makeTranslationMatrix(x, y, z, instance.matrix.clone()), redMaterialGenerator)])
//}

function computePoint2(next: OperationNextCallback, astId: string, primitive: Primitive, x: number, z: number): any {
    primitive.matrix.multiply(makeTranslationMatrix(x, 0, z))
    return next(new PointPrimitive(primitive.matrix))
}

const helperVector = new Vector3()

function computeFace(
    next: OperationNextCallback,
    astId: string,
    instance: Primitive,
    ...points: ReadonlyArray<Primitive>
): any {
    if (points.length < 3) {
        return next(instance)
    }
    const points2d = points.map((point) => {
        helperVector.setFromMatrixPosition(point.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    if (ShapeUtils.isClockWise(points2d)) {
        points2d.reverse()
    }

    return next(new FacePrimitive(instance.matrix, new Shape(points2d)))
}

function computeSample(next: OperationNextCallback, astId: string, instance: Primitive, amount: number): any {
    return next(instance.samplePoints(amount))
}

const size = new Vector3()
const box3Helper = new Box3()

function computeSize(next: OperationNextCallback, astId: string, instance: Primitive, axis: "x" | "y" | "z"): any {
    instance.getBoundingBox(box3Helper)
    box3Helper.getSize(size)
    return next(size[axis])
}

function computeScale(
    next: OperationNextCallback,
    astId: string,
    instance: Primitive,
    x: number,
    y: number,
    z: number
): Primitive {
    instance.multiplyMatrix(makeScaleMatrix(x, y, z))
    return next(instance)
}

function degreeToRadians(degree: number): number {
    return (Math.PI * degree) / 180
}

function computeRotate(
    next: OperationNextCallback,
    astId: string,
    instance: Primitive,
    x: number,
    y: number,
    z: number
): any {
    instance.multiplyMatrix(makeRotationMatrix(degreeToRadians(x), degreeToRadians(y), degreeToRadians(z)))
    return next(instance)
}

function computeTranslate(
    next: OperationNextCallback,
    astId: string,
    primitive: Primitive,
    x: number,
    y: number,
    z: number
): any {
    primitive.multiplyMatrix(makeTranslationMatrix(x, y, z))
    return next(primitive)
}

function computeExtrude(next: OperationNextCallback, astId: string, instance: Primitive, by: number): any {
    return next(instance.extrude(by))
}

function computeComponents(
    type: "points" | "lines" | "faces",
    next: OperationNextCallback,
    astId: string,
    ...instances: Array<Primitive>
): any {
    const components = instances.reduce<Array<Primitive>>(
        (instances, instance) => [...instances, ...instance.components(type)],
        []
    )
    return next(components)
}

const ZAXIS = new Vector3(0, 0, 1)

function computeSplit(
    next: OperationNextCallback,
    astId: string,
    instance: Primitive,
    axis: Axis,
    repetitions: boolean | number,
    ...sizes: Array<number>
): any {
    if (sizes.length === 0) {
        return next(instance)
    }

    const splits = Split(instance, axis, (matrix, index, x, y, z) => {
        const repetitionIndex = Math.floor(index / sizes.length)
        const size = sizes[index % sizes.length]
        if (
            (repetitions === false && repetitionIndex == 0) ||
            repetitions === true ||
            (typeof repetitions === "number" && repetitionIndex < repetitions)
        ) {
            const sizeX = axis === "x" ? Math.min(size, x) : x
            const sizeZ = axis === "z" ? Math.min(size, z) : z
            return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, ZAXIS)
        } else {
            return FacePrimitive.fromLengthAndHeight(matrix, x, z, ZAXIS)
        }
    })
    return next(splits)
}

function computeDirection(next: OperationNextCallback, astId: string, instance: Primitive): any {
    return next(getDirection(instance.matrix))
}

export const operations: Operations = {
    translate: {
        execute: computeTranslate,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    scale: {
        execute: computeScale,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [
            () => ({ type: "raw", value: 1 }),
            () => ({ type: "raw", value: 1 }),
            () => ({ type: "raw", value: 1 }),
        ],
    },
    rotate: {
        execute: computeRotate,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    extrude: {
        execute: computeExtrude,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [() => ({ type: "raw", value: 1 })],
    },
    split: {
        execute: computeSplit,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [
            () => ({ type: "raw", value: "x" }),
            () => ({ type: "raw", value: true }),
            () => ({ type: "raw", value: 1 }),
        ],
    },
    toFaces: {
        execute: computeComponents.bind(null, "faces"),
        includeThis: true,
        includeQueue: false,
        defaultParameters: [],
    },
    sample: {
        execute: computeSample,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [() => ({ type: "raw", value: 10 })],
    },
    size: {
        execute: computeSize,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [() => ({ type: "raw", value: "x" })],
    },
    point2: {
        execute: computePoint2,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [() => ({ type: "raw", value: 0 }), () => ({ type: "raw", value: 0 })],
    },
    face: {
        execute: computeFace,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [],
    },
    gableRoof: {
        execute: computeGableRoof,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [
            () => ({
                type: "raw",
                value: 0,
            }),
        ],
    },
    direction: {
        execute: computeDirection,
        includeThis: true,
        includeQueue: false,
        defaultParameters: [],
    },
}

export function isPrimitive(value: any): value is Primitive {
    return value instanceof Primitive
}

export function primitivesToGeometry(primitives: Array<Primitive>): BufferGeometry | null {
    if(primitives.length === 0) {
        return null
    }
    return mergeBufferGeometries(
        primitives.map((primitive) => primitive.getGeometry().clone().applyMatrix4(primitive.matrix))
    )
}

export * from "./math.js"
export * from "./primitive.js"
export * from "./exporter.js"
