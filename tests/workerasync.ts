import { initializeWorker } from "../src/index.js"
import { operations } from "../src/domains/motion/index.js"
import { interpreterOptions } from "../web/src/state/worker.js"
import { Primitive } from "../src/domains/building/primitive.js"

initializeWorker({
    ...interpreterOptions,
    cloneValue(value) {
        if (value instanceof Primitive) {
            return value.clone()
        }
        //änderung, mocha mag kein structuredClone, deepClone unvollständig
        return deepClone(value)
    },
    computeDurationMS: 10,
    operations: {
        ...operations,
    },
})

function deepClone(object: unknown) {
    if (typeof object === "object" && !Array.isArray(object) && object !== null) {
        let objects = {}
        for (const [key, values] of Object.entries(object)) {
            if (typeof values === "object" && !Array.isArray(values) && values !== null) {
                objects = { ...objects, [key]: { ...values } }
            } else {
                objects = { ...objects, [key]: values }
            }
        }
        return object
    } else {
        return object
    }
}
