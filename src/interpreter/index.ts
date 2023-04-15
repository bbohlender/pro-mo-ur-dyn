import { NestedDescription, NestedStochasticSwitch, NestedTransformation } from "../index.js"

export type Operation<T> = {
    execute: (...parameters: ReadonlyArray<any>) => Array<T> | T
    includeThis: boolean
    defaultParameters: Array<() => NestedTransformation>
}

export type Operations<T> = {
    [Name in string]: Operation<T>
}

export type Value<T> = {
    raw: T
    index: Array<number>
    variables: {
        [Name in string]: any
    }
}

export type InterpreterOptions<T> = Readonly<{
    seed?: number
    listeners?: {
        onStochasticSwitch?: (step: NestedStochasticSwitch, value: Value<T>, childStepIndex: number) => void
        onBeforeTransformation?: (step: NestedTransformation, value: Value<T>) => void
        onAfterTransformation?: (step: NestedTransformation, value: Value<T>[]) => void
    }
    /**
     * compares the priority between two entries; higher priority results in an faster execution. Example function: (v1, v2) => v1.prio - v2.prio (returns negative value if the order is wrong)
     */
    comparePriority: (v1: T, v2: T) => number
    createValue: (initialVariables: NestedDescription["initialVariables"]) => T
    cloneValue: (value: T) => T
    operations: Operations<T>
    computeDurationMS: number
    getComputeProgress(value: T): any
    shouldInterrrupt(startProgress: any, currentProgress: any): boolean
    shouldWait(currentProgress: any): boolean
}>
