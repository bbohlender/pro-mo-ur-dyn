import { NestedTransformation } from "../index.js"
import { Value } from "./index.js"

export type QueueEntry<T> = {
    value: Value<T>
    /**
     * list of transformation that still needs to be executed, next transformation that should be executed is at stack[0]
     */
    stack: Array<NestedTransformation>
}

export class Queue<T> {
    /**
     * sorted list entries; highest priority at index 0
     */
    public readonly list: Array<QueueEntry<T>> = []

    public readonly results: Array<Value<T>> = []

    /**
     *
     * @param compare should compare the priority between two entries; higher priority results in an faster execution. Example function: (v1, v2) => v1.prio - v2.prio (returns negative value if the order is wrong)
     */
    constructor(private compare: (v1: T, v2: T) => number) {}

    /**
     * remove the stack entry with the highest priority
     */
    pop(): QueueEntry<T> | undefined {
        return this.list.shift()
    }

    /**
     * @returns the stack entry with the highest priority
     */
    peek(): QueueEntry<T> | undefined {
        return this.list[0]
    }

    /**
     * add a entry to the queue sorted by priority
     */
    push(entry: QueueEntry<T>): void {
        if (entry.stack.length === 0) {
            this.results.push(entry.value)
            return
        }
        let i = this.list.length - 1
        while (i > 0 && this.compare(entry.value.raw, this.list[i].value.raw) < 0) {
            i--
        }
        this.list.splice(i, 0, entry)
    }
}
