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
    execute: (next: OperationNextCallback, astId: string, ...parameters: ReadonlyArray<any>) => any
    includeThis: boolean
    includeQueue: boolean
    defaultParameters: Array<() => NestedTransformation>
}

export type OperationNextCallback = (
    newRaw: any | Array<any>,
    ...newTransformations: Array<NestedTransformation>
) => any

export type Operations = {
    [Name in string]: Operation
}

export type Value = {
    raw: any
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
    comparePriority: (v1: unknown, v2: unknown) => number
    createValue: (initialVariables: NestedDescription["initialVariables"], astId: string) => any
    serialize: (queue: Queue, prevProgress: any, currentProgress: any | undefined) => any
    cloneValue: (value: unknown) => unknown
    operations: Operations
    computeDurationMS: number
    getComputeProgress(value: unknown): any
    shouldInterrrupt(startProgress: any, currentProgress: any): boolean
    shouldWait(requestedProgress: any, currentProgress: any): boolean
}>

export function interprete(
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    references: InterpreterReferences,
    publishResult: (queue: Queue, prevProgress: any, currentProgress: any) => void
): Queue {
    const queue = new Queue(options.comparePriority)
    const descriptionsEntries = Object.entries(descriptions)
    for (let i = 0; i < descriptionsEntries.length; i++) {
        const [identifier, { initialVariables, rootNounIdentifier, nouns }] = descriptionsEntries[i]
        const noun = nouns[rootNounIdentifier]
        if (noun == null) {
            throw new Error(`unknown noun "${rootNounIdentifier}" at description "${identifier}"`)
        }
        if (initialVariables.interprete === false) {
            continue
        }
        queue.push({
            value: {
                raw: options.createValue(initialVariables, noun.astId!),
                variables: { ...initialVariables, index: 0 },
            },
            stack: [noun.transformation],
        })
    }
    interpreteQueueRecursive(queue, descriptions, options, references, publishResult)
    return queue
}

//TODO later: group values and transformations for SIMD (=> check if that creates a speedup)

function nextQueued(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    newRaw: any | Array<any> | undefined,
    ...newTransformations: Array<NestedTransformation>
) {
    const currentEntry = queue.peek()
    if (currentEntry == null) {
        return
    }
    if (Array.isArray(newRaw)) {
        queue.pop()
        for (let index = 0; index < newRaw.length; index++) {
            queue.push({
                value: {
                    raw: newRaw[index],
                    variables: {
                        ...currentEntry.value.variables,
                        index,
                    },
                },
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
        return
    }

    if (currentEntry.stack.length === 0) {
        queue.pop()
        queue.push(currentEntry)
        return
    }
}

export function interpreteQueueRecursive(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    references: InterpreterReferences,
    publishResult: (queue: Queue, prevProgress: any, currentProgress: any) => void
) {
    let nextEntry: QueueEntry | undefined = queue.peek()
    if (nextEntry == null) {
        return
    }

    const startTime = new Date().getTime()
    const progressAtStart = options.getComputeProgress(nextEntry.value.raw)

    /**
     * we interprete continously until either
     *  1. nothing left to interprete
     *  2. x seconds in real time passed
     *  3. the interpreter has made enough progress
     */
    while (
        nextEntry != null &&
        new Date().getTime() - startTime < options.computeDurationMS &&
        !options.shouldInterrrupt(progressAtStart, options.getComputeProgress(nextEntry.value.raw))
    ) {
        const transformation = nextEntry.stack.shift()!
        if (transformation.type === "parallel") {
            queue.pop()
            for (const [index, nextTransformation] of transformation.children.entries()) {
                queue.push({
                    value: {
                        raw: options.cloneValue(nextEntry.value.raw),
                        variables: { ...nextEntry.value.variables, index },
                    },
                    stack: [nextTransformation, ...nextEntry.stack],
                })
            }
        } else {
            interpreteTransformation(queue, descriptions, options, nextEntry.value, transformation, nextQueued)
        }
        nextEntry = queue.peek()
    }

    publishResult(
        queue,
        progressAtStart,
        nextEntry == null ? undefined : options.getComputeProgress(nextEntry.value.raw)
    )

    if (
        nextEntry == null ||
        options.shouldWait(references.requestedProgress, options.getComputeProgress(nextEntry.value.raw))
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
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    newRaw: any | Array<any> | undefined,
    ...newTransformations: Array<NestedTransformation>
) => R

/**
 * interpretes the transformation and reschedules the value(s) with their respective stacks in the queue
 */
function interpreteTransformation<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedTransformation,
    next: NextCallback<R>
): R {
    switch (transformation.type) {
        case "operation":
            return interpreteOperation(queue, descriptions, options, value, transformation, next)
        case "precomputedOperation":
            return interpretePrecomputedOperation(queue, descriptions, options, value, transformation, next)
        case "raw":
            return interpreteRaw(queue, descriptions, options, value, transformation, next)
        case "sequential":
            return interpreteSequential(queue, descriptions, options, value, transformation, next)
        case "nounReference":
            return interpreteNounReference(queue, descriptions, options, value, transformation, next)
        case "this":
            return interpreteThis(queue, descriptions, options, value, next)
        case "-()":
        case "!":
            return interpreteUnaryOperator(queue, descriptions, options, value, transformation, next)
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
            return interpreteBinaryOperator(queue, descriptions, options, value, transformation, next)
        case "if":
            return interpreteIf(queue, descriptions, options, value, transformation, next)
        case "switch":
            return interpreteSwitch(queue, descriptions, options, value, transformation, next)
        case "getVariable":
            return interpreteGetVariable(queue, descriptions, options, value, transformation, next)
        case "setVariable":
            return interpreteSetVariable(queue, descriptions, options, value, transformation, next)
        case "stochasticSwitch":
            return interpreteStochasticSwitch(queue, descriptions, options, value, transformation, next)
    }
    throw new Error(`unknown transformation type "${transformation.type}"`)
}

const nextSynchronous = (
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    newRaw: any | Array<any> | undefined,
    ...newTransformations: Array<NestedTransformation>
) => {
    if (Array.isArray(newRaw)) {
        throw new Error(`unable to compute parallel values in synchronous interpretation`)
    }
    if (newRaw !== undefined) {
        value.raw = newRaw
    }
    for (const transformation of newTransformations) {
        interpreteTransformationSynchronous(queue, descriptions, options, value, transformation)
    }
    return value
}

export function interpreteTransformationSynchronous(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedTransformation
): Value {
    return interpreteTransformation(queue, descriptions, options, value, transformation, nextSynchronous)
}

function interpreteStochasticSwitch<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedStochasticSwitch,
    next: NextCallback<R>
): R {
    const rand = Math.random() // murmurhash.v3(value.variables.index ?? "", options.seed) / _32bit_max_int

    let sum = 0
    let i = -1
    do {
        i++
        sum += transformation.probabilities[i]
    } while (rand > sum && i < transformation.probabilities.length)

    options.listeners?.onStochasticSwitch?.(transformation, value, i)

    return next(queue, descriptions, options, value, undefined, transformation.children[i])
}

function interpreteGetVariable<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedGetVariable,
    next: NextCallback<R>
): R {
    const variable = value.variables[transformation.identifier]
    if (variable == null) {
        throw new Error(`unknown variable "${transformation.identifier}"`)
    }
    return next(queue, descriptions, options, value, variable)
}

function interpreteSetVariable<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedSetVariable,
    next: NextCallback<R>
): R {
    value.variables[transformation.identifier] = interpreteTransformationSynchronous(
        queue,
        descriptions,
        options,
        { raw: options.cloneValue(value.raw), variables: { ...value.variables } },
        transformation.children[0]
    )
    return next(queue, descriptions, options, value, undefined)
}

function interpreteSwitch<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedSwitch,
    next: NextCallback<R>
): R {
    const { raw } = interpreteTransformationSynchronous(
        queue,
        descriptions,
        options,
        { raw: options.cloneValue(value.raw), variables: { ...value.variables } },
        transformation.children[0]
    )
    for (let i = 0; i < transformation.cases.length; i++) {
        const currenttransformation = transformation.cases[i]
        if (currenttransformation.includes(raw)) {
            return next(queue, descriptions, options, value, undefined, transformation.children[i + 1])
        }
    }
    throw new Error(`no case matched`)
}

function interpreteNounReference<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedNounReference,
    next: NextCallback<R>
): R {
    const description = descriptions[transformation.descriptionIdentifier]
    const noun = description?.nouns[transformation.nounIdentifier]
    if (noun == null) {
        throw new Error(
            `unknown noun "${transformation.nounIdentifier}" from description "${transformation.descriptionIdentifier}"`
        )
    }
    return next(queue, descriptions, options, value, undefined, noun.transformation)
}

function interpreteIf<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedIf,
    next: NextCallback<R>
): R {
    const conditionOperatorValue = interpreteTransformationSynchronous(
        queue,
        descriptions,
        options,
        { raw: options.cloneValue(value.raw), variables: { ...value.variables } },
        transformation.children[0]
    )
    if (conditionOperatorValue.raw) {
        return next(queue, descriptions, options, value, undefined, transformation.children[1])
    } else {
        return next(queue, descriptions, options, value, undefined, transformation.children[2])
    }
}

function interpreteSequential<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedSequantial,
    next: NextCallback<R>
): R {
    return next(queue, descriptions, options, value, undefined, ...transformation.children)
}

function interpreteBinaryOperator<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedBinaryOperator,
    next: NextCallback<R>
): R {
    const [v1, v2] = transformation.children.map((child) =>
        interpreteTransformationSynchronous(
            queue,
            descriptions,
            options,
            { raw: options.cloneValue(value.raw), variables: { ...value.variables } },
            child
        )
    )
    return next(queue, descriptions, options, value, binaryOperations[transformation.type](v1.raw, v2.raw))
}

function interpreteOperation<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedOperation,
    next: NextCallback<R>
): R {
    //removing the entry from the queue, since we are replacing the value of the entry
    const operation = options.operations[transformation.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${transformation.identifier}"`)
    }
    const parameters = transformation.children
        .map((child) =>
            interpreteTransformationSynchronous(
                queue,
                descriptions,
                options,
                { raw: options.cloneValue(value.raw), variables: { ...value.variables } },
                child
            )
        )
        .map(({ raw }) => raw)

    if (operation.includeQueue) {
        parameters.unshift(queue)
    }
    if (operation.includeThis) {
        parameters.unshift(value.raw)
    }
    return operation.execute(
        next.bind(null, queue, descriptions, options, value),
        transformation.astId!,
        ...parameters
    ) as R
}

function interpretePrecomputedOperation<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedPrecomputedOperation,
    next: NextCallback<R>
): R {
    const operation = options.operations[transformation.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${transformation.identifier}"`)
    }
    const parameters = [...transformation.parameters]
    if (operation.includeQueue) {
        parameters.unshift(
            queue.list
                .slice(1)
                .map(({ value: { raw } }) => raw)
                .concat(queue.results.map(({ raw }) => raw))
        )
    }
    if (operation.includeThis) {
        parameters.unshift(value.raw)
    }
    return operation.execute(
        next.bind(null, queue, descriptions, options, value),
        transformation.astId!,
        ...parameters
    ) as R
}

function interpreteRaw<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: ParsedRaw,
    next: NextCallback<R>
): R {
    return next(queue, descriptions, options, value, transformation.value)
}

export const unaryOperations: { [Name in NestedUnaryOperator["type"]]: (value: any) => any } = {
    "-()": (value) => -value,
    "!": (value) => !value,
}

function interpreteUnaryOperator<R>(
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    transformation: NestedUnaryOperator,
    next: NextCallback<R>
): R {
    const parameter = interpreteTransformationSynchronous(
        queue,
        descriptions,
        options,
        { raw: options.cloneValue(value.raw), variables: { ...value.variables } },
        transformation.children[0]
    )
    return next(queue, descriptions, options, value, unaryOperations[transformation.type](parameter.raw))
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
    queue: Queue,
    descriptions: NestedDescriptions,
    options: InterpreterOptions,
    value: Value,
    next: NextCallback<R>
): R {
    return next(queue, descriptions, options, value, undefined)
}

export const _32bit_max_int = Math.pow(2, 32)

export * from "./worker-interface.js"
export * from "./initialize-worker.js"
