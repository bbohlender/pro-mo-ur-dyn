import { initializeWorker } from "../src/interpreter/initialize-worker.js"

initializeWorker({
    cloneValue: (v) => v,
    compareProgress(v1: number, v2: number) {
        return v2 - v1
    },
    computeDurationMS: Number.MAX_SAFE_INTEGER,
    createValue: () => 0,
    computeProgress: () => 0,
    operations: {},
    shouldInterrrupt: () => false,
    serialize: (values) => values,
    seed: 0,
})
