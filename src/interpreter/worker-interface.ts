// @ts-ignore
import Worker from "web-worker"
import { NestedDescriptions } from "../index.js"
import { Value } from "./index.js"

export type WorkerMessage =
    | {
          type: WorkerMessageType.Interprete
          descriptions: NestedDescriptions
          requestedProgress: any
      }
    | {
          type: WorkerMessageType.UpdateRequestedProgress
          requestedProgress: any
      }
    | {
          type: WorkerMessageType.Results
          result: any
          isFinal: boolean
      }

export enum WorkerMessageType {
    UpdateRequestedProgress,
    Interprete,
    Results,
}

export class WorkerInterface {
    private worker: Worker | null = null

    constructor(
        private url: URL,
        private options: { credentials?: RequestCredentials; name?: string; type?: WorkerType },
        private onResult: (result: any, isFinal: boolean) => void
    ) {
        this.worker = new Worker(url, options)
        this.worker.onmessage = this.onMessage.bind(this)
    }

    private onMessage(e: MessageEvent<WorkerMessage>) {
        switch (e.data.type) {
            case WorkerMessageType.Results:
                this.onResult(e.data.result, e.data.isFinal)
                return
        }
    }

    interprete(descriptions: NestedDescriptions, requestedProgress: any) {
        this.sendMessage({
            type: WorkerMessageType.Interprete,
            descriptions,
            requestedProgress,
        })
    }

    updateRequestedProgress(requestedProgress: any) {
        this.sendMessage({
            type: WorkerMessageType.UpdateRequestedProgress,
            requestedProgress,
        })
    }

    private sendMessage(msg: WorkerMessage): void {
        this.worker.postMessage(msg)
    }

    terminate() {
        this.worker.terminate()
    }

    reset() {
        this.worker.terminate()
        this.worker = new Worker(this.url, this.options)
    }
}
