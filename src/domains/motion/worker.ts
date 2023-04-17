import { initializeWorker } from "../worker.js"
import { MotionEntity, interpreterOptions } from "./index.js"

initializeWorker<MotionEntity>(interpreterOptions, 10000)
