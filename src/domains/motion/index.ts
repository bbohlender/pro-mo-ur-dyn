import { NestedPrecomputedOperation } from "../../index.js"
import { InterpreterOptions, Operations } from "../../interpreter/index.js"

export const operations: Operations = {
    moveTo: {
        defaultParameters: [],
        includeThis: true,
        execute: (entity: MotionEntity, x: number, y: number, z: number, dt: number) => {
            const t = entity.keyframes[entity.keyframes.length - 1]![3]
            entity.keyframes.push([x, y, z, t + dt])
            return entity
        },
    },
    moveBy: {
        defaultParameters: [],
        includeThis: true,
        execute: (entity: MotionEntity, dx: number, dy: number, dz: number, dt: number) => {
            const [x, y, z, t] = entity.keyframes[entity.keyframes.length - 1]!
            entity.keyframes.push([x + dx, y + dy, z + dz, t + dt])
            return entity
        },
    },
}

export const interpreterOptions: InterpreterOptions = {
    cloneValue(value) {
        if (isMotionEntity(value)) {
            return { keyframes: [...value.keyframes], type: value.type }
        }
    },
    comparePriority(e1, e2, e1Trans, e2Trans) {
        if (!isMotionEntity(e1) || !isMotionEntity(e2)) {
            return 0
        }
        let addedCurrTime = 0
        let addedListItemTime = 0
        if (
            typeof e1Trans === "object" &&
            !Array.isArray(e1Trans) &&
            e1Trans !== null &&
            "type" in e1Trans &&
            e1Trans.type == "precomputedOperation"
        ) {
            const oper = e1Trans as NestedPrecomputedOperation
            addedCurrTime = oper.children[3]
        }
        if (
            typeof e2Trans === "object" &&
            !Array.isArray(e2Trans) &&
            e2Trans !== null &&
            "type" in e2Trans &&
            e2Trans.type == "precomputedOperation"
        ) {
            const oper = e2Trans as NestedPrecomputedOperation
            addedListItemTime = oper.children[3]
        }
        return (
            e1.keyframes[e1.keyframes.length - 1]![3] +
            addedCurrTime -
            (e2.keyframes[e2.keyframes.length - 1]![3] + addedListItemTime)
        )
    },
    computeDurationMS: 1000,
    createValue({ type, x, y, z, time }) {
        return {
            type: motionEntityTypeMap[type as keyof typeof motionEntityTypeMap] ?? MotionEntityType.Pedestrian,
            keyframes: [[x ?? 0, y ?? 0, z ?? 0, time ?? 0]],
        }
    },
    getComputeProgress(entity) {
        if (!isMotionEntity(entity)) {
            return 0
        }
        return entity.keyframes[entity.keyframes.length - 1][3]
    },
    operations,
    shouldInterrrupt(startProgress, currentProgress) {
        return currentProgress - startProgress > 1000 //interrupt every second
    },
    shouldWait(p) {
        return p > 10000 //only computes the first 10 second
    },
}

export enum MotionEntityType {
    Car,
    Pedestrian,
    Cyclist,
}

const motionEntityTypeMap = {
    car: MotionEntityType.Car,
    cylcist: MotionEntityType.Cyclist,
    predestrian: MotionEntityType.Pedestrian,
}

export type MotionEntity = {
    type: MotionEntityType
    keyframes: Array<readonly [number, number, number, number]> //3D + Time
}

function isMotionEntity(value: unknown): value is MotionEntity {
    return typeof value === "object" && value != null && "keyframes" in value
}
