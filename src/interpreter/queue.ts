import { NestedTransformation } from "../index.js"
import { Value } from "./index.js"

export type QueueEntry = {
    value: Value
    /**
     * list of transformation that still needs to be executed, next transformation that should be executed is at stack[0]
     */
    stack: Array<NestedTransformation>
    seed: string
    id: string
}

export class Queue {
    /**
     * sorted list entries; highest priority at index 0
     */
    public readonly list: Array<QueueEntry> = []

    public readonly results: Array<{ raw: any; id: string }> = []

    private highestFinishedProgress: unknown | undefined

    public currentProgress: unknown

    private readonly resultCache: { [Key in string]: any } = {}

    public getCached<T>(key: string, fn: (results: Array<{ raw: any; id: string }>) => T): T {
        if (key in this.resultCache) {
            return this.resultCache[key]
        }
        return (this.resultCache[key] = fn(this.results))
    }

    /**
     *
     * @param compare should compare the priority between two entries; higher priority results in an faster execution. Example function: (v1, v2) => v1.prio - v2.prio (returns negative value if the order is wrong)
     */
    constructor(
        private computeProgress: (value: unknown | undefined) => unknown,
        private compareProgress: (v1: unknown, v2: unknown) => number
    ) {
        this.currentProgress = this.computeProgress(undefined)
    }

    /**
     * remove the stack entry with the highest priority
     */
    pop(): QueueEntry | undefined {
        return this.list.shift()
    }

    /**
     * @returns the stack entry with the highest priority
     */
    peek(): QueueEntry | undefined {
        return this.list[0]
    }

    /**
     * add a entry to the queue sorted by priority
     */
    push(entry: QueueEntry): void {
        const entryProgress = this.computeProgress(entry.value.raw)
        if (entry.stack.length === 0) {
            this.results.push({ raw: entry.value.raw, id: entry.id })
            if (
                this.highestFinishedProgress == null ||
                this.compareProgress(entryProgress, this.highestFinishedProgress) < 0
            ) {
                this.highestFinishedProgress = entryProgress
            }
        } else {
            let i = 0
            while (
                i < this.list.length &&
                this.compareProgress(entryProgress, this.computeProgress(this.list[i].value.raw)) < 0
            ) {
                i++
            }
            this.list.splice(i, 0, entry)
        }

        this.currentProgress =
            this.list.length === 0 ? this.highestFinishedProgress : this.computeProgress(this.list[0].value.raw)
    }
}
