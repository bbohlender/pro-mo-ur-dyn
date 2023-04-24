import { initializeWorker } from "../src/interpreter/initialize-worker.js"

initializeWorker({
    cloneValue: (v) => v,
    comparePriority: () => 0,
    computeDurationMS: Number.MAX_SAFE_INTEGER,
    createValue: () => 0,
    getComputeProgress: () => 0,
    operations: {},
    shouldInterrrupt: () => false,
    shouldWait: () => false,
    serialize: (values) => values,
    seed: 0,
})
