import { NestedDescriptions } from "../index.js"
import { InterpreterOptions, InterpreterReferences, Value, interprete, interpreteQueueRecursive } from "./index.js"
import { Queue } from "./queue.js"
import { WorkerMessage, WorkerMessageType } from "./worker-interface.js"

function publishResult(values: Array<Value>, isFinal: boolean) {
    postMessage({ type: WorkerMessageType.Results, values, isFinal })
}

export function initializeWorker(options: InterpreterOptions): void {
    let references: InterpreterReferences | undefined
    let queue: Queue | undefined
    let descriptions: NestedDescriptions | undefined
    self.onmessage = (e: MessageEvent<WorkerMessage>) => {
        switch (e.data.type) {
            case WorkerMessageType.Interprete:
                if (references?.timeoutRef != null) {
                    throw new Error(`unable to interprete while interpretation is already running`)
                }
                references = {
                    requestedProgress: e.data.requestedProgress,
                }
                descriptions = e.data.descriptions
                queue = interprete(e.data.descriptions, options, references, publishResult)
                return
            case WorkerMessageType.UpdateRequestedProgress:
                if (queue == null || descriptions == null || references == null) {
                    throw new Error(`unable to update requested progress when interpretation has not yet been started`)
                }
                references.requestedProgress = e.data.requestedProgress
                //verstehe den code nicht
                //if (references.timeoutRef != null) {
                interpreteQueueRecursive(queue, descriptions, options, references, publishResult)
                //}
                return
        }
    }
}
