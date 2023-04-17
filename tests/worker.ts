import { initializeWorker } from "../src/domains/worker.js"

initializeWorker<number>(
    {
        cloneValue: (v) => v,
        comparePriority: () => 0,
        computeDurationMS: Number.MAX_SAFE_INTEGER,
        createValue: () => 0,
        getComputeProgress: () => 0,
        operations: {},
        shouldInterrrupt: () => false,
        shouldWait: () => false,
        seed: 0,
    },
    10000
)
