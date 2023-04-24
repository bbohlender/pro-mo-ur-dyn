import { Matrix4 } from "three"
import { InterpreterOptions, initializeWorker } from "../../../dist/index.js"
import {
    MotionEntity,
    comparePriority,
    createMotionEntitiy,
    getMotionEntityProgress,
    isMotionEntity,
    operations as motionOperations,
} from "../../../dist/domains/motion/index.js"
import {
    PointPrimitive,
    Primitive,
    makeTranslationMatrix,
    operations as buildingOperations,
    serializePrimitive,
} from "../../../dist/domains/building/index.js"

export const interpreterOptions: InterpreterOptions = {
    cloneValue(value) {
        if (value instanceof Primitive) {
            return value.clone()
        }
        //änderung
        return structuredClone(value)
    },
    comparePriority(v1, v2) {
        if (isMotionEntity(v1)) {
            if (isMotionEntity(v2)) {
                return comparePriority(v1, v2, undefined, undefined)
            }
            return -1
        }

        if (isMotionEntity(v2)) {
            return 1
        }
        return 0
    },
    computeDurationMS: 1000,
    createValue(variables, astId: string) {
        if (variables.type === "building") {
            return new PointPrimitive(
                makeTranslationMatrix(variables.x ?? 0, variables.y ?? 0, variables.z ?? 0, new Matrix4())
            )
        }
        return createMotionEntitiy(variables, astId)
    },
    getComputeProgress(value) {
        if (isMotionEntity(value)) {
            return getMotionEntityProgress(value)
        }
        return 0
    },
    operations: {
        ...buildingOperations,
        ...motionOperations,
    },
    shouldInterrrupt(startProgress, currentProgress) {
        return currentProgress - startProgress > 3 //3 seconds computed
    },
    shouldWait(requestedProgress, currentProgress) {
        return requestedProgress <= currentProgress
    },
    serialize(values, prevProgress, currentProgress) {
        return values.map((value) => {
            if (isMotionEntity(value.raw)) {
                //const index = value.raw.keyframes.findIndex((keyframe) => keyframe.t > prevProgress)
                return { keyframes: value.raw.keyframes /*.slice(index)*/, type: value.raw.type } satisfies MotionEntity
            }
            if (value.raw instanceof Primitive) {
                return serializePrimitive(value.raw)
            }
            return value
        })
    },
}

initializeWorker(interpreterOptions)
