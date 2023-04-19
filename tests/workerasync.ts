import { interpreterOptions } from "../src/domains/motion/index.js"
import { initializeWorker } from "../src/interpreter/initialize-worker.js"

initializeWorker({
    ...interpreterOptions,
    computeDurationMS: 1,
})
