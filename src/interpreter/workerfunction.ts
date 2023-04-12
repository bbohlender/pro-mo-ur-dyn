//TODO: declare protocol for communication (message types)
//TODO: write a good interface to start and stop (restart) the interpretation that abstracts the worker and has a callback which gets called with the new results

import { expose } from "comlink"
import { Operations } from "./index.js"
import { parse } from "../index.js"
import { interpreteTransformationSynchronous } from "./interpreter.js"

function testInterpreteSynchronously(text: string, operations: Operations<any> = {}, seed?: number): any {
    const descriptions = parse(text)
    const [description] = Object.values(descriptions)
    const rootTransformation = description.nouns[description.rootNounIdentifier]
    const { raw } = interpreteTransformationSynchronous(
        { raw: 1, index: [], variables: {} },
        rootTransformation,
        descriptions,
        {
            cloneValue: (v) => v,
            comparePriority: () => 0,
            computeDurationMS: 0,
            createValue: () => 0,
            getComputeProgress: () => 0,
            operations,
            shouldInterrrupt: () => false,
            shouldWait: () => false,
            seed,
        }
    )
    postMessage({ type: "finalResult", data: raw })
    return
}

const workerinterface = {
    testInterpreteSynchronously,
}

export type WorkerInterprete = typeof workerinterface

expose(workerinterface)
