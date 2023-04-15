import { InterpreterOptions, Operations } from "../../interpreter/index.js"

const operations: Operations<MotionEntity> = {
    moveTo: {
        defaultParameters: [],
        includeThis: true,
        execute: (entity: MotionEntity, x: number, y: number, z: number, dt: number) => {
            const t = entity.keyframes.at(-1)![3]
            entity.keyframes.push([x, y, z, t + dt])
            return entity
        },
    },
    moveBy: {
        defaultParameters: [],
        includeThis: true,
        execute: (entity: MotionEntity, dx: number, dy: number, dz: number, dt: number) => {
            const [x, y, z, t] = entity.keyframes.at(-1)!
            entity.keyframes.push([x + dx, y + dy, z + dz, t + dt])
            return entity
        },
    },
}

export const interpreterOptions: InterpreterOptions<MotionEntity> = {
    cloneValue({ keyframes, type }) {
        return { keyframes: [...keyframes], type }
    },
    comparePriority(e1, e2) {
        return e2.keyframes.at(-1)![3] - e1.keyframes.at(-1)![3]
    },
    computeDurationMS: 1000,
    createValue({ type, x,y,z, time}) {
        return {
        type: motionEntityTypeMap[type as keyof typeof motionEntityTypeMap] ??  MotionEntityType.Pedestrian,
        keyframes: [x ?? 0, y ?? 0, z ?? 0, time ?? 0]
    }},
    getComputeProgress(entity) {
        return entity.keyframes.at(-1)![3]
    },
    operations,
    shouldInterrrupt(startProgress, currentProgress) {
        return currentProgress - startProgress > 1000 //interrupt every second
    },
    shouldWait(p) {
        return p > 10000 //only computes the first 10 second
    }
}

export enum MotionEntityType {
    Car,
    Pedestrian,
    Cyclist,
}

const motionEntityTypeMap = {
    car: MotionEntityType.Car,
    cylcist: MotionEntityType.Cyclist,
    predestrian: MotionEntityType.Pedestrian
}

export type MotionEntity = {
    type: MotionEntityType
    keyframes: Array<readonly [number, number, number, number]> //3D + Time
}
