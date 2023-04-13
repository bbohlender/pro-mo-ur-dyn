import {
    NestedBinaryOperator,
    NestedDescriptions,
    NestedGetVariable,
    NestedIf,
    NestedNounReference,
    NestedOperation,
    NestedSequantial,
    NestedSetVariable,
    NestedStochasticSwitch,
    NestedSwitch,
    NestedTransformation,
    NestedUnaryOperator,
    ParsedRaw,
} from "../index.js"
import { InterpreterOptions, Value } from "./index.js"
import { Queue, QueueEntry } from "./queue.js"
import murmurhash from "murmurhash"

function clone<T>(
    value: Value<T>,
    { cloneValue }: InterpreterOptions<T>,
    raw = cloneValue(value.raw),
    index = value.index,
    variables = { ...value.variables }
): Value<T> {
    return { raw, index, variables }
}

export function interprete<T>(
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    publishResult: (values: Array<Value<any>>, isLast: boolean) => void
): void {
    const queue = new Queue<T>(options.comparePriority)
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
    interpreteQueueRecursive(queue, descriptions, options, publishResult)
}

//TODO later: group values and transformations for SIMD (=> check if that creates a speedup)

//TODO: do sth. with the result once all transformations are applied (= the stack is empty)

function nextQueued(
    queue: Queue<any>,
    value: Value<any>,
    newRaw: any | Array<any> | undefined,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<any>,
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
                stack: [...currentEntry.stack, ...newTransformations],
            })
        }
        return
    }

    currentEntry.stack.push(...newTransformations)

    if (newRaw !== undefined) {
        //we need to reinsert the entry since the value changed which can change the change the priority and this the order in the queue
        queue.pop()
        currentEntry.value.raw = newRaw
        queue.push(currentEntry)
    }
}

function interpreteQueueRecursive(
    queue: Queue<any>,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<any>,
    publishResult: (values: Array<Value<any>>, isLast: boolean) => void
) {
    let nextEntry: QueueEntry<any> | undefined = queue.peek()
    if (nextEntry == null) {
        return
    }
    const next: NextCallback<any, void> = nextQueued.bind(null, queue)

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
        nextEntry.stack.length > 0 &&
        new Date().getTime() - startTime < options.computeDurationMS &&
        !options.shouldInterrrupt(progressAtStart, options.getComputeProgress(nextEntry.value))
    ) {
        const transformation = nextEntry.stack.shift()!
        if (transformation.type === "parallel") {
            queue.pop()
            for (const [index, nextTransformation] of transformation.children.entries()) {
                queue.push({
                    value: clone(nextEntry.value, options, undefined, [...nextEntry.value.index, index]),
                    stack: [...nextEntry.stack, nextTransformation],
                })
            }
        } else {
            interpreteTransformation(nextEntry.value, transformation, descriptions, options, next)
        }

        nextEntry = queue.peek()
    }

    publishResult(
        queue.list.map(({ value }) => value),
        nextEntry == null
    )

    if (nextEntry == null || options.shouldWait(options.getComputeProgress(nextEntry.value))) {
        return
    }

    //recursively call to enable a kill instruction from the main webworker to be received
    setTimeout(interpreteQueueRecursive.bind(null, queue, descriptions, options, publishResult), 0)
}

type NextCallback<T, R> = (
    value: Value<T>,
    newRaw: T | Array<T> | undefined,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    ...newTransformations: Array<NestedTransformation>
) => R

/**
 * interpretes the transformation and reschedules the value(s) with their respective stacks in the queue
 */
function interpreteTransformation<T, R>(
    value: Value<T>,
    transformation: NestedTransformation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    switch (transformation.type) {
        case "operation":
            return interpreteOperation(value, transformation, descriptions, options, next)
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

const nextSynchronous: NextCallback<any, Value<any>> = (
    value,
    newRaw,
    descriptions,
    options,
    ...newTransformations
) => {
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

export function interpreteTransformationSynchronous<T>(
    value: Value<T>,
    transformation: NestedTransformation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>
): Value<T> {
    return interpreteTransformation(value, transformation, descriptions, options, nextSynchronous)
}

function interpreteStochasticSwitch<T, R>(
    value: Value<T>,
    transformation: NestedStochasticSwitch,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
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

function interpreteGetVariable<T, R>(
    value: Value<T>,
    transformation: NestedGetVariable,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    const variable = value.variables[transformation.identifier]
    if (variable == null) {
        throw new Error(`unknown variable "${transformation.identifier}"`)
    }
    return next(value, variable, descriptions, options)
}

function interpreteSetVariable<T, R>(
    value: Value<T>,
    transformation: NestedSetVariable,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    value.variables[transformation.identifier] = interpreteTransformationSynchronous(
        clone(value, options),
        transformation.children[0],
        descriptions,
        options
    )
    return next(value, undefined, descriptions, options)
}

function interpreteSwitch<T, R>(
    value: Value<T>,
    transformation: NestedSwitch,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
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

function interpreteNounReference<T, R>(
    value: Value<T>,
    transformation: NestedNounReference,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
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

function interpreteIf<T, R>(
    value: Value<T>,
    transformation: NestedIf,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
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

function interpreteSequential<T, R>(
    value: Value<T>,
    transformation: NestedSequantial,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    return next(value, undefined, descriptions, options, ...transformation.children)
}

function interpreteBinaryOperator<T, R>(
    value: Value<T>,
    transformation: NestedBinaryOperator,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    const [v1, v2] = transformation.children.map((child) =>
        interpreteTransformationSynchronous(clone(value, options), child, descriptions, options)
    )
    return next(value, binaryOperations[transformation.type](v1.raw, v2.raw), descriptions, options)
}

function interpreteOperation<T, R>(
    value: Value<T>,
    transformation: NestedOperation,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
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

    const result = operation.execute(...parameters.map(({ raw }) => raw))
    return next(value, result, descriptions, options)
}

function interpreteRaw<T, R>(
    value: Value<T>,
    transformation: ParsedRaw,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    return next(value, transformation.value, descriptions, options)
}

export const unaryOperations: { [Name in NestedUnaryOperator["type"]]: (value: any) => any } = {
    "-()": (value) => -value,
    "!": (value) => !value,
}

function interpreteUnaryOperator<T, R>(
    value: Value<T>,
    transformation: NestedUnaryOperator,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
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

function interpreteThis<T, R>(
    value: Value<T>,
    descriptions: NestedDescriptions,
    options: InterpreterOptions<T>,
    next: NextCallback<T, R>
): R {
    return next(value, undefined, descriptions, options)
}

export const _32bit_max_int = Math.pow(2, 32)
