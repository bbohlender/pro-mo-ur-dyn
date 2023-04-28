import { initializeWorker } from "pro-3d-video"
import {
    operations as buildingOperations,
    isPrimitive,
    makeTranslationMatrix,
    PointPrimitive,
    Primitive,
    primitivesToGeometry,
} from "pro-3d-video/building"
import {
    operations as motionOperations,
    compareMotionEntityPriority,
    getMotionEntityProgress,
    isMotionEntity,
    createMotionEntitiy,
} from "pro-3d-video/motion"
import { isPathway, Pathway, operations as pathwayOperations, pathwaysToGeometry } from "pro-3d-video/pathway"
import { BufferGeometryLoader, Matrix4 } from "three"

const loader = new BufferGeometryLoader()

initializeWorker({
    cloneValue(value) {
        if (value instanceof Primitive) {
            return value.clone()
        }
        return structuredClone(value)
    },
    comparePriority(v1, v2) {
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
        switch (variables.type ?? "pedestrian") {
            case "building":
                return new PointPrimitive(
                    makeTranslationMatrix(variables.x ?? 0, variables.y ?? 0, variables.z ?? 0, new Matrix4())
                )
            case "footwalk":
            case "street":
                return {
                    points: [{ x: variables.x ?? 0, y: variables.y ?? 0, size: variables.size ?? 0, astId }],
                    type: variables.type,
                } satisfies Pathway

            default:
                return createMotionEntitiy(variables, astId)
        }
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
        ...pathwayOperations,
    },
    shouldInterrrupt(startProgress, currentProgress) {
        return currentProgress - startProgress > 3 //3 seconds computed
    },
    shouldWait(requestedProgress, currentProgress) {
        return requestedProgress <= currentProgress
    },
    serialize(queue, prevProgress, currentProgress) {
        const all = queue.list.map(({ value: { raw } }) => raw).concat(queue.results.map(({ raw }) => raw))
        return {
            building: queue
                .getCached("building", (results) =>
                    primitivesToGeometry(results.map(({ raw }) => raw).filter(isPrimitive))
                )
                ?.toJSON(),
            street: queue
                .getCached("street", (results) =>
                    pathwaysToGeometry(results.map(({ raw }) => raw).filter(isPathway), "street")
                )
                ?.toJSON(),
            footwalk: queue
                .getCached("footwalk", (results) =>
                    pathwaysToGeometry(results.map(({ raw }) => raw).filter(isPathway), "footwalk")
                )
                ?.toJSON(),
            agents: all.filter(isMotionEntity),
        }
        /*return values.map((value) => {
            /*if (isMotionEntity(value.raw)) {
                const index = value.raw.keyframes.findIndex((keyframe) => keyframe.t > prevProgress)
                return { keyframes: value.raw.keyframes.slice(index), type: value.raw.type } satisfies MotionEntity
            }
            if (value.raw instanceof Primitive) {
                return serializePrimitive(value.raw)
            }
            return value.raw
        })*/
    },
})
