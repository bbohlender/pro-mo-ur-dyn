import { initializeWorker } from "pro-3d-video"
import {
    operations as buildingOperations,
    makeTranslationMatrix,
    PointPrimitive,
    Primitive,
} from "pro-3d-video/building"
import {
    operations as motionOperations,
    compareMotionEntityPriority,
    getMotionEntityProgress,
    isMotionEntity,
    createMotionEntitiy,
    MotionEntity,
} from "pro-3d-video/motion"
import { Matrix4 } from "three"

initializeWorker({
    cloneValue(value) {
        if (value instanceof Primitive) {
            return value.clone()
        }
        return structuredClone(value)
    },
    comparePriority(v1, v2) {
        console.log("x")
        if (isMotionEntity(v1)) {
            if (isMotionEntity(v2)) {
                return compareMotionEntityPriority(v1, v2)
            }
            return -1
        }

        if (isMotionEntity(v2)) {
            return 1
        }
        return 0
    },
    computeDurationMS: 1000,
    createValue(variables, astId) {
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
                return { keyframes: value.raw.keyframes/*.slice(index)*/, type: value.raw.type } satisfies MotionEntity
            }
            if (value.raw instanceof Primitive) {
                const geometry = value.raw.getGeometry()
                if (value.raw instanceof PointPrimitive) {
                    return { type: "point", matrix: value.raw.matrix.toArray(), geometry: geometry.attributes }
                } /*else if (value.raw instanceof LinePri) {
                    return { type: "line", geometry: (geometry as Line<BufferGeometry>).geometry.toJSON() }
                } */ else {
                    return { type: "mesh", matrix: value.raw.matrix.toArray(), geometry: geometry.toJSON() }
                }
            }
            return value
        })
    },
})
