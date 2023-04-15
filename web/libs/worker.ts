//TODO: declare protocol for communication (message types)
//TODO: write a good interface to start and stop (restart) the interpretation that abstracts the worker and has a callback which gets called with the new results
// @ts-ignore
import { wrap } from "comlink"
import Worker from "web-worker"
import { Value } from "../../dist/interpreter"

export class NewWorker {
    public worker: Worker | null = null

    public options: { credentials?: RequestCredentials; name?: string; type?: WorkerType }

    public url: URL

    constructor(options: { credentials?: RequestCredentials; name?: string; type?: WorkerType }) {
        this.worker = new Worker(new URL("./workerfunction", import.meta.url), options)
        this.options = options
        this.url = new URL("./workerfunction", import.meta.url)
    }

    onmessage(onmessage: (e: any) => void) {
        this.worker!.onmessage = onmessage
    }

    postMessage(e: any) {
        this.worker!.postMessage("wird zum ww gesendet")
    }

    async updateTime(time: number) {
        this.worker!.postMessage({ type: "updateTime", data: time })
    }

    terminate() {
        this.worker!.terminate()
    }

    reset() {
        this.worker!.terminate()
        this.worker = new Worker(this.url, this.options)
    }
}

export async function workerStart() {
    console.log("start")
    const StartTime = performance.now()
    const newworker = new NewWorker({
        name: "testInterpreteAsynchronously",
        type: "module",
    })

    const workerInterprete = wrap<import("./workerfunction").WorkerInterprete>(
        newworker.worker!
    ).testInterpreteAsynchronously

    let result: any = null
    let resultReady = false

    newworker.onmessage((e: any) => {
        if (e.data) {
            if (e.data.type == "finalResult") {
                result = (e.data.data as Value<any>[]).map((v) => v.raw)
                resultReady = true
                newworker.terminate()
            }
        }
    })

    workerInterprete(`Test { a --> ((1 | 2 * 2) -> this * 2) }
`)

    while (!resultReady) {
        await Sleep(0)
    }
    console.log(result)
    const Time = performance.now() - StartTime
    console.log(Time + "ms")
}

function Sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
