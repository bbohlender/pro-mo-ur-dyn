import { NestedDescriptions } from "../index.js"
import {
    InterpreterOptions,
    InterpreterReferences,
    Value,
    interprete,
    interpreteQueueRecursive,
} from "../interpreter/index.js"
import { Queue } from "../interpreter/queue.js"
import { WorkerMessage, WorkerMessageType } from "../interpreter/worker-interface.js"

function publishResult(values: Array<Value<any>>, isFinal: boolean) {
    postMessage({ type: WorkerMessageType.Results, values, isFinal })
}

export function initializeWorker<T>(options: InterpreterOptions<T>, initialRequestedProgress: any): void {
    const references: InterpreterReferences = {
        requestedProgress: initialRequestedProgress,
    }
    let queue: Queue<any> | undefined
    let descriptions: NestedDescriptions | undefined
    self.onmessage = (e: MessageEvent<WorkerMessage>) => {
        switch (e.data.type) {
            case WorkerMessageType.Interprete:
                if (references.timeoutRef != null) {
                    throw new Error(`unable to interprete while interpretation is already running`)
                }
                descriptions = e.data.descriptions
                queue = interprete(e.data.descriptions, options, references, publishResult)
                return
            case WorkerMessageType.UpdateRequestedProgress:
                if (queue == null || descriptions == null) {
                    throw new Error(`unable to update requested progress when interpretation has not yet been started`)
                }
                references.requestedProgress = e.data.requestedProgress
                if (references.timeoutRef != null) {
                    interpreteQueueRecursive(queue, descriptions, options, references, publishResult)
                }
                return
        }
    }
}
