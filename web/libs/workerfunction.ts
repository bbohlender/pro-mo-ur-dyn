import { expose } from "comlink"
import { parse } from "../../dist/parser/index.js"
import { Operations, Value } from "../../dist/interpreter/index.js"
import { interprete } from "../../dist/interpreter/interpreter.js"

function testInterpreteAsynchronously(text: string, seed?: number) {
    const descriptions = parse(text)
    interprete(
        descriptions,
        {
            cloneValue: (v: any) => v,
            comparePriority: () => 0,
            computeDurationMS: 1000,
            createValue: () => 0,
            getComputeProgress: () => 0,
            operations: {},
            shouldInterrrupt: () => false,
            shouldWait: () => false,
            seed,
        },
        (values: Array<Value<any>>, isLast: boolean) => {
            if (isLast) {
                postMessage({ type: "finalResult", data: values })
            } else {
                postMessage({ type: "result", data: values })
            }
        }
    )
}

const workerinterface = {
    testInterpreteAsynchronously,
}

export type WorkerInterprete = typeof workerinterface

expose(workerinterface)
