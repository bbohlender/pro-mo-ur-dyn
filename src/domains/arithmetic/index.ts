import { InterpreterOptions, Operations, Value } from "../../interpreter/index.js"

const operations: Operations = {}

export const arithmeticInterpreterOptions: InterpreterOptions = {
    cloneValue(value) {
        return value
    },
    serialize(values: Value[], prevProgress: any, currentProgress: any) {
        return values
    },
    comparePriority(e1, e2, e1Trans, e2Trans) {
        return (e1 as number) - (e2 as number)
    },
    computeDurationMS: 1000,
    createValue() {
        return 0
    },
    getComputeProgress() {
        return 0
    },
    operations,
    shouldInterrrupt(startProgress, currentProgress) {
        return currentProgress - startProgress > 1000 //interrupt every second
    },
    shouldWait(p) {
        return p > 10000 //only computes the first 10 second
    },
}
