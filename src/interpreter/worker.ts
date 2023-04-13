//TODO: declare protocol for communication (message types)
//TODO: write a good interface to start and stop (restart) the interpretation that abstracts the worker and has a callback which gets called with the new results
// @ts-ignore
import Worker from "web-worker"

export class NewWorker {
    public worker: Worker | null = null

    public options: { credentials?: RequestCredentials; name?: string; type?: WorkerType }

    public url: URL

    constructor(url: URL, options: { credentials?: RequestCredentials; name?: string; type?: WorkerType }) {
        this.worker = new Worker(url, options)
        this.options = options
        this.url = url
    }

    onmessage(onmessage: (e: any) => void) {
        this.worker.onmessage = onmessage
    }

    postMessage(e: any) {
        this.worker.postMessage("wird zum ww gesendet")
    }

    async updateTime(time: number) {
        this.worker.postmessage({ type: "updateTime", data: time })
    }

    terminate() {
        this.worker.terminate()
    }

    reset() {
        this.worker.terminate()
        this.worker = new Worker(this.url, this.options)
    }
}
