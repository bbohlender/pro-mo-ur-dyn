import {
    NestedDescription,
    NestedStochasticSwitch,
    NestedTransformation,
    NestedBinaryOperator,
    NestedDescriptions,
    NestedGetVariable,
    NestedIf,
    NestedNounReference,
    NestedOperation,
    NestedSequantial,
    NestedSetVariable,
    NestedSwitch,
    NestedUnaryOperator,
    ParsedRaw,
    NestedPrecomputedOperation,
} from "../index.js"
import { Queue, QueueEntry } from "./queue.js"
import murmurhash from "murmurhash"

export type Operation = {
    execute: (...parameters: ReadonlyArray<any>) => Array<any> | any
    includeThis: boolean
    defaultParameters: Array<() => NestedTransformation>
    preComputeParameters?: boolean
}

export type Operations = {
    [Name in string]: Operation
}

export type Value = {
    raw: any
    index: Array<number>
    variables: {
        [Name in string]: any
    }
}

export type InterpreterReferences = {
    requestedProgress: any
    timeoutRef?: NodeJS.Timeout
}

export type InterpreterOptions = Readonly<{
    seed?: number
    listeners?: {
        onStochasticSwitch?: (step: NestedStochasticSwitch, value: Value, childStepIndex: number) => void
        onBeforeTransformation?: (step: NestedTransformation, value: Value) => void
        onAfterTransformation?: (step: NestedTransformation, value: Value[]) => void
    }
    /**
     * compares the priority between two entries; higher priority results in an faster execution. Example function: (v1, v2) => v1.prio - v2.prio (returns negative value if the order is wrong)
     */
    comparePriority: (v1: unknown, v2: unknown, v1Trans: unknown, v2Trans: unknown) => number
    createValue: (initialVariables: NestedDescription["initialVariables"]) => any
    cloneValue: (value: unknown) => unknown
    operations: Operations
    computeDurationMS: number
    getComputeProgress(value: unknown): any
    shouldInterrrupt(startProgress: any, currentProgress: any): boolean
    shouldWait(requestedProgress: any, currentProgress: any): boolean
}>

function clone(
    value: Value,
    { cloneValue }: InterpreterOptions,
    raw = cloneValue(value.raw),
    index = value.index,
    variables = { ...value.variables }
): Value {
    return { raw, index, variables }
}

export function interprete(
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    references: InterpreterReferences,
    publishResult: (values: Array<Value>, isLast: boolean) => void
): Queue {
    const queue = new Queue(options.comparePriority)
    const descriptionsEntries = Object.entries(descriptions)
    for (let i = 0; i < descriptionsEntries.length; i++) {
        const [identifier, { initialVariables, rootNounIdentifier, nouns }] = descriptionsEntries[i]
        const rootTransformation = nouns[rootNounIdentifier]
        if (rootTransformation == null) {
            throw new Error(`unknown noun "${rootNounIdentifier}" at description "${identifier}"`)
        }
        queue.push({
            value: {
                index: [i],
                raw: options.createValue(initialVariables),
                variables: initialVariables,
            },
            stack: [rootTransformation],
        })
    }
    interpreteQueueRecursive(queue, descriptions, options, references, publishResult)
    return queue
}

//TODO later: group values and transformations for SIMD (=> check if that creates a speedup)

function nextQueued(
    queue: Queue,
    value: Value,
    newRaw: any | Array<any> | undefined,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    ...newTransformations: Array<NestedTransformation>
) {
    const currentEntry = queue.peek()
    if (currentEntry == null) {
        return
    }
    if (Array.isArray(newRaw)) {
        queue.pop()
        for (const raw of newRaw) {
            queue.push({
                value: clone(currentEntry.value, options, raw),
                stack: [...newTransformations, ...currentEntry.stack],
            })
        }
        return
    }

    currentEntry.stack.unshift(...newTransformations)

    if (newRaw !== undefined) {
        //we need to reinsert the entry since the value changed which can change the change the priority and this the order in the queue
        queue.pop()
        currentEntry.value.raw = newRaw
        queue.push(currentEntry)
    }
}

export function interpreteQueueRecursive(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    references: InterpreterReferences,
    publishResult: (values: Array<Value>, isLast: boolean) => void
) {
    let nextEntry: QueueEntry | undefined = queue.peek()
    if (nextEntry == null) {
        return
    }
    const next: NextCallback<void> = nextQueued.bind(null, queue)

    const startTime = new Date().getTime()
    const progressAtStart = options.getComputeProgress(nextEntry.value)

    /**
     * we interprete continously until either
     *  1. nothing left to interprete
     *  2. x seconds in real time passed
     *  3. the interpreter has made enough progress
     */
    while (
        nextEntry != null &&
        new Date().getTime() - startTime < options.computeDurationMS &&
        !options.shouldInterrrupt(progressAtStart, options.getComputeProgress(nextEntry.value))
    ) {
        const transformation = nextEntry.stack.shift()!
        //console.log("neue iteration")
        if (transformation.type === "parallel") {
            queue.pop()
            for (const [index, nextTransformation] of transformation.children.entries()) {
                queue.push({
                    value: clone(nextEntry.value, options, undefined, [...nextEntry.value.index, index]),
                    stack: [nextTransformation, ...nextEntry.stack],
                })
            }
        } else {
            interpreteTransformation(nextEntry.value, transformation, descriptions, options, next)
        }
        nextEntry = queue.peek()
        for (let i = 0; i < 10000000; i++) {
            //
        }
    }

    publishResult(queue.list.map((entry) => entry.value).concat(queue.results), nextEntry == null)

    if (
        nextEntry == null ||
        options.shouldWait(references.requestedProgress, options.getComputeProgress(nextEntry.value))
    ) {
        return
    }

    //recursively call to enable a kill instruction from the main webworker to be received
    references.timeoutRef = setTimeout(() => {
        references.timeoutRef = undefined
        interpreteQueueRecursive(queue, descriptions, options, references, publishResult)
    }, 0)
}

type NextCallback<R> = (
    value: Value,
    newRaw: any | Array<any> | undefined,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    ...newTransformations: Array<NestedTransformation>
) => R

/**
 * interpretes the transformation and reschedules the value(s) with their respective stacks in the queue
 */
function interpreteTransformation<R>(
    value: Value,
    transformation: NestedTransformation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    switch (transformation.type) {
        case "operation":
            return interpreteOperation(value, transformation, descriptions, options, next)
        case "precomputedOperation":
            return interpretePrecomputedOperation(value, transformation, descriptions, options, next)
        case "raw":
            return interpreteRaw(value, transformation, descriptions, options, next)
        case "sequential":
            return interpreteSequential(value, transformation, descriptions, options, next)
        case "nounReference":
            return interpreteNounReference(value, transformation, descriptions, options, next)
        case "this":
            return interpreteThis(value, descriptions, options, next)
        case "-()":
        case "!":
            return interpreteUnaryOperator(value, transformation, descriptions, options, next)
        case "+":
        case "&&":
        case "/":
        case "==":
        case ">":
        case ">=":
        case "%":
        case "*":
        case "||":
        case "<":
        case "<=":
        case "-":
        case "!=":
            return interpreteBinaryOperator(value, transformation, descriptions, options, next)
        case "if":
            return interpreteIf(value, transformation, descriptions, options, next)
        case "switch":
            return interpreteSwitch(value, transformation, descriptions, options, next)
        case "getVariable":
            return interpreteGetVariable(value, transformation, descriptions, options, next)
        case "setVariable":
            return interpreteSetVariable(value, transformation, descriptions, options, next)
        case "stochasticSwitch":
            return interpreteStochasticSwitch(value, transformation, descriptions, options, next)
    }
    throw new Error(`unknown transformation type "${transformation.type}"`)
}

const nextSynchronous: NextCallback<Value> = (value, newRaw, descriptions, options, ...newTransformations) => {
    if (Array.isArray(newRaw)) {
        throw new Error(`unable to compute parallel values in synchronous interpretation`)
    }
    if (newRaw !== undefined) {
        value.raw = newRaw
    }
    for (const transformation of newTransformations) {
        interpreteTransformationSynchronous(value, transformation, descriptions, options)
    }
    return value
}

export function interpreteTransformationSynchronous(
    value: Value,
    transformation: NestedTransformation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions
): Value {
    return interpreteTransformation(value, transformation, descriptions, options, nextSynchronous)
}

function interpreteStochasticSwitch<R>(
    value: Value,
    transformation: NestedStochasticSwitch,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const rand = murmurhash.v3(value.index.join(","), options.seed) / _32bit_max_int

    let sum = 0
    let i = -1
    do {
        i++
        sum += transformation.probabilities[i]
    } while (rand > sum && i < transformation.probabilities.length)

    options.listeners?.onStochasticSwitch?.(transformation, value, i)

    return next(value, undefined, descriptions, options, transformation.children[i])
}

function interpreteGetVariable<R>(
    value: Value,
    transformation: NestedGetVariable,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const variable = value.variables[transformation.identifier]
    if (variable == null) {
        throw new Error(`unknown variable "${transformation.identifier}"`)
    }
    return next(value, variable, descriptions, options)
}

function interpreteSetVariable<R>(
    value: Value,
    transformation: NestedSetVariable,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    value.variables[transformation.identifier] = interpreteTransformationSynchronous(
        clone(value, options),
        transformation.children[0],
        descriptions,
        options
    )
    return next(value, undefined, descriptions, options)
}

function interpreteSwitch<R>(
    value: Value,
    transformation: NestedSwitch,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const { raw } = interpreteTransformationSynchronous(
        clone(value, options),
        transformation.children[0],
        descriptions,
        options
    )
    for (let i = 0; i < transformation.cases.length; i++) {
        const currenttransformation = transformation.cases[i]
        if (currenttransformation.includes(raw)) {
            return next(value, undefined, descriptions, options, transformation.children[i + 1])
        }
    }
    throw new Error(`no case matched`)
}

function interpreteNounReference<R>(
    value: Value,
    transformation: NestedNounReference,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const description = descriptions[transformation.descriptionIdentifier]
    const nounTransformation = description?.nouns[transformation.nounIdentifier]
    if (nounTransformation == null) {
        throw new Error(
            `unknown noun "${transformation.nounIdentifier}" from description "${transformation.descriptionIdentifier}"`
        )
    }
    return next(value, undefined, descriptions, options, nounTransformation)
}

function interpreteIf<R>(
    value: Value,
    transformation: NestedIf,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const conditionOperatorValue = interpreteTransformationSynchronous(
        clone(value, options),
        transformation.children[0],
        descriptions,
        options
    )
    if (conditionOperatorValue.raw) {
        return next(value, undefined, descriptions, options, transformation.children[1])
    } else {
        return next(value, undefined, descriptions, options, transformation.children[2])
    }
}

function interpreteSequential<R>(
    value: Value,
    transformation: NestedSequantial,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    return next(value, undefined, descriptions, options, ...transformation.children)
}

function interpreteBinaryOperator<R>(
    value: Value,
    transformation: NestedBinaryOperator,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const [v1, v2] = transformation.children.map((child) =>
        interpreteTransformationSynchronous(clone(value, options), child, descriptions, options)
    )
    return next(value, binaryOperations[transformation.type](v1.raw, v2.raw), descriptions, options)
}

function interpreteOperation<R>(
    value: Value,
    transformation: NestedOperation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    //removing the entry from the queue, since we are replacing the value of the entry
    const operation = options.operations[transformation.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${transformation.identifier}"`)
    }
    const parameters = transformation.children.map((child) =>
        interpreteTransformationSynchronous(clone(value, options), child, descriptions, options)
    )

    if (operation.includeThis) {
        parameters.unshift(clone(value, options))
    }
    if (operation.preComputeParameters) {
        return next(value, value, descriptions, options, {
            type: "precomputedOperation",
            children: parameters.map((v) => v.raw),
            identifier: transformation.identifier,
            id: transformation.id,
        })
    }
    const result = operation.execute(...parameters.map(({ raw }) => raw))
    return next(value, result, descriptions, options)
}

function interpretePrecomputedOperation<R>(
    value: Value,
    transformation: NestedPrecomputedOperation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const operation = options.operations[transformation.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${transformation.identifier}"`)
    }
    const parameters = transformation.children

    const result = operation.execute(...parameters)
    return next(value, result, descriptions, options)
}

function interpreteRaw<R>(
    value: Value,
    transformation: ParsedRaw,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    return next(value, transformation.value, descriptions, options)
}

export const unaryOperations: { [Name in NestedUnaryOperator["type"]]: (value: any) => any } = {
    "-()": (value) => -value,
    "!": (value) => !value,
}

function interpreteUnaryOperator<R>(
    value: Value,
    transformation: NestedUnaryOperator,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    const parameter = interpreteTransformationSynchronous(
        clone(value, options),
        transformation.children[0],
        descriptions,
        options
    )
    return next(value, unaryOperations[transformation.type](parameter.raw), descriptions, options)
}

export const binaryOperations: { [Name in NestedBinaryOperator["type"]]: (v1: any, v2: any) => any } = {
    "+": (v1, v2) => v1 + v2,
    "&&": (v1, v2) => v1 && v2,
    "/": (v1, v2) => v1 / v2,
    "==": (v1, v2) => v1 == v2,
    ">": (v1, v2) => v1 > v2,
    ">=": (v1, v2) => v1 >= v2,
    "%": (v1, v2) => v1 % v2,
    "*": (v1, v2) => v1 * v2,
    "||": (v1, v2) => v1 || v2,
    "<": (v1, v2) => v1 < v2,
    "<=": (v1, v2) => v1 <= v2,
    "-": (v1, v2) => v1 - v2,
    "!=": (v1, v2) => v1 != v2,
}

function interpreteThis<R>(
    value: Value,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    next: NextCallback<R>
): R {
    return next(value, undefined, descriptions, options)
}

export const _32bit_max_int = Math.pow(2, 32)

export * from "./worker-interface.js"
