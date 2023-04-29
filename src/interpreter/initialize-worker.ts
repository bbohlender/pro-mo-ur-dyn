import { NestedDescriptions } from "../index.js"
import { InterpreterOptions, InterpreterReferences, Value, interprete, interpreteQueueRecursive } from "./index.js"
import { Queue } from "./queue.js"
import { WorkerMessage, WorkerMessageType } from "./worker-interface.js"

function publishResult(options: InterpreterOptions, queue: Queue, prevProgress: any, progress: any, isFinal: boolean) {
    postMessage({
        type: WorkerMessageType.Results,
        result: options.serialize(queue, prevProgress, progress),
        progress,
        isFinal,
    })
}

export function initializeWorker(options: InterpreterOptions): void {
    let references: InterpreterReferences | undefined
    let queue: Queue | undefined
    let descriptions: NestedDescriptions | undefined
    const publish = publishResult.bind(null, options)
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
                queue = interprete(e.data.descriptions, options, references, publish)
                return
            case WorkerMessageType.UpdateRequestedProgress:
                if (queue == null || descriptions == null || references == null) {
                    throw new Error(`unable to update requested progress when interpretation has not yet been started`)
                }
                references.requestedProgress = e.data.requestedProgress
                if (references.timeoutRef == null) {
                    interpreteQueueRecursive(queue, descriptions, options, references, publish)
                }
                return
        }
    }
}
