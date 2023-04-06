import { v3 } from "murmurhash"
import {
    AbstractParsedGrammarDefinition,
    AbstractParsedRandom,
    AbstractParsedSteps,
    ParsedBinaryOperator,
    ParsedGetVariable,
    ParsedGrammarDefinition,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRaw,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
    ParsedUnaryOperator,
} from "../parser"
import { interpreteQueueStep } from "./queueInterpreter"

export type Operation<T> = {
    execute: (parametersExe: Value<ReadonlyArray<T>>) => Array<Value<T>>
    includeThis: boolean
    changesTime: boolean
    defaultParameters: Array<() => ParsedSteps>
}

export function simpleExecution<T>(
    execute: (...params: ReadonlyArray<T>) => Array<T>
): (prms: Value<ReadonlyArray<T>>) => Array<Value<T>> {
    return (prms) => execute(...prms.raw).map((result, i) => ({ ...prms, raw: result, index: [...prms.index, i] }))
}

export function simpleSceneExecution<T>(
    execute: (
        variables: {
            [x: string]: any
        },
        ...parameters: ReadonlyArray<any>
    ) => Array<T>
): (parameters: Value<ReadonlyArray<T>>) => Array<Value<any>> {
    return (parameters) =>
        execute(parameters.variables, ...parameters.raw).map((result, i) => ({
            ...parameters,
            raw: result,
            index: [...parameters.index, i],
        }))
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
    symbolDepth: {
        [Name in string]: number
    }
}

export type InterpreterOptions<T, I> = Readonly<{
    seed?: number
    delay?: number
    maxSymbolDepth?: number
    listeners?: {
        onRandom?: (step: AbstractParsedRandom<I>, value: Value<T>, childStepIndex: number) => void
        onBeforeStep?: (step: AbstractParsedSteps<I>, value: Value<T>[]) => void
        onAfterStep?: (step: AbstractParsedSteps<I>, value: Value<T>[]) => void
    }
}>

export type InterpretionContext<T, I> = Readonly<
    {
        grammar: ParsedGrammarDefinition
        compiledGrammar: CompiledGrammar<T>
        operations: Operations<T>
        maxSymbolDepth: number
    } & InterpreterOptions<T, I>
>

type CompiledGrammar<T> = { [Name in string]: Value<T> }

export type AbstractParsedStepsTime<I> = { time: number; step: AbstractParsedSteps<I>; value: Value<any> }

export const queue = [] as AbstractParsedStepsTime<any>[]
export const resultsFinal: Value<any>[] = []

export function interprete<T, I>(
    value: Value<T>[],
    grammar: AbstractParsedGrammarDefinition<I>,
    operations: Operations<T>,
    options: InterpreterOptions<T, I>
): Value<T>[] | null {
    if (grammar.length === 0) {
        return null
    }
    const startSymbolName = grammar[0].name
    const compiledGrammar: CompiledGrammar<T> = {}
    const context: InterpretionContext<T, I> = {
        grammar,
        compiledGrammar,
        operations,
        ...options,
        maxSymbolDepth: options.maxSymbolDepth ?? 50,
    }

    for (const values of value) {
        let time = 0
        const val = values.raw
        if (typeof val === "object" && !Array.isArray(val) && val !== null) {
            if ("time" in val) {
                time = (val as any).time as any as number
            }
        }
        for (const { name, step } of grammar) {
            queue.push({ time, step, value: values })
        }
    }
    while (queue.length > 0) {
        const newItem = queue.shift()
        if (newItem) {
            if (resultsFinal.length > 0) {
                self.postMessage(resultsFinal)
                resultsFinal.splice(0, resultsFinal.length)
            }
            interpreteQueueStep(
                newItem.value,
                newItem.step,
                context,
                ["name"],
                { type: "sequential", children: [] },
                newItem.time
            )
        }
    }
    self.postMessage(resultsFinal)

    return resultsFinal
}

export function interpreteStep<T, I>(
    value: Value<T>[],
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const { delay: time, listeners } = context
    if (listeners?.onBeforeStep != null) {
        const onBeforeStep = listeners.onBeforeStep.bind(null, step)
        onBeforeStep(value)
    }

    const nextValue = translateStep(value, step, context, path)

    if (listeners?.onAfterStep != null) {
        const onAfterStep = listeners.onAfterStep.bind(null, step)
        onAfterStep(nextValue)
    }
    return nextValue
}

function translateStep<T, I>(
    value: Value<T>[],
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    switch (step.type) {
        case "operation":
            return interpreteOperation(value, step, context, path)
        case "parallel":
            return interpreteParallel(value, step, context, path)
        case "raw":
            return interpreteRaw(value, step, path)
        case "sequential":
            return interpreteSequential(value, step, context, path)
        case "symbol":
            return interpreteSymbol(value, step, context, path)
        case "this":
            return interpreteThis(value)
        case "invert":
        case "not":
            return interpreteUnaryOperator(value, step, context, path)
        case "add":
        case "and":
        case "divide":
        case "equal":
        case "greater":
        case "greaterEqual":
        case "modulo":
        case "multiply":
        case "or":
        case "smaller":
        case "smallerEqual":
        case "subtract":
        case "unequal":
            return interpreteBinaryOperator(value, step, context, path)
        case "if":
            return interpreteIf(value, step, context, path)
        case "switch":
            return interpreteSwitch(value, step, context, path)
        case "getVariable":
            return interpreteGetVariable(value, step)
        case "setVariable":
            return interpreteSetVariable(value, step, context, path)
        case "random":
            return interpreteRandom(value, step, context, path)
    }
    return {} as Value<T>[]
}

function interpreteRandom<T, A, I>(
    value: Value<T>[],
    step: AbstractParsedRandom<I>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const newValue = [] as Value<T>[]

    const stepProb: number[] = []
    for (let i = 0; i < step.probabilities.length; i++) {
        if (i == 0) {
            stepProb.push(step.probabilities[i])
        } else {
            stepProb.push(step.probabilities[i] + stepProb[stepProb.length - 1])
        }
    }
    value.forEach((v) => {
        const rand = v3(v.index.join(","), context.seed) / _32bit_max_int
        //const rand = Math.random()
        const stepIndex = stepProb.findIndex((e) => rand <= e)
        if (stepIndex !== -1) {
            if (context.listeners?.onRandom != null) {
                const onRandom = context.listeners.onRandom
                onRandom(step, v, stepIndex)
            }
            const interpreVals = interpreteStep([v], step.children[stepIndex], context, [...path, stepIndex])
            newValue.push(...interpreVals)
        }
    })
    return newValue
}

function interpreteGetVariable<T>(value: Value<T>[], step: ParsedGetVariable): Value<T>[] {
    return value[0].variables[step.identifier]
}

function interpreteSetVariable<T, I>(
    value: Value<T>[],
    step: ParsedSetVariable,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const valueOperatorFunction = interpreteStep(value, step.children[0], context, [...path, 0])
    value.map((v) => {
        return { ...v, variables: { ...v.variables, [step.identifier]: valueOperatorFunction } }
    })
    return value
}

function interpreteSwitch<T, I>(
    value: Value<T>[],
    step: ParsedSwitch,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    //const valueOperator = interpreteStep(value, step.children[0], context)[0]
    //const casesOperatorFunctions = step.children.slice(1).map((child) => interpreteStep(child, context, next))
    let newValue = value
    const conditionOperatorValue = interpreteStep(value, step.children[0], context, [...path, 0])[0]
    for (let i = 0; i < step.cases.length; i++) {
        const currentStep = step.cases[i]
        if (currentStep.some((e) => e === conditionOperatorValue.raw)) {
            newValue = interpreteStep(newValue, step.children[i + 1], context, [...path, i + 1])
        }
    }

    return newValue
}

function interpreteSymbol<T, I>(
    value: Value<T>[],
    step: ParsedSymbol,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    /*     if (getNounIndex(step.identifier, context.grammar) == null) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    } */

    const depthArray = value.map((val) => (val.index.length ?? 0) >= context.maxSymbolDepth)
    if (depthArray.some((val) => val)) {
        throw new Error(`maximum symbol depth (${context.maxSymbolDepth}) reached for symbol "${step.identifier}"`)
    }

    const grammar = context.grammar.find((v) => v.name === step.identifier)
    if (!grammar) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    const newValue = interpreteStep(value, grammar.step, context, [step.identifier])
    return newValue
}

function interpreteParallel<T, I>(
    value: Value<T>[],
    step: ParsedParallel,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const newVal = [] as Value<T>[]
    for (const [index, steps] of step.children.entries()) {
        value.map((valueStep, j) => {
            const returnVal = interpreteStep([{ ...valueStep, index: [...valueStep.index, index] }], steps, context, [
                ...path,
                index,
            ])
            newVal.push(...returnVal)
        })
    }
    return newVal
}

function interpreteIf<T, I>(
    value: Value<T>[],
    step: ParsedIf,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const conditionOperatorValue = interpreteStep(value, step.children[0], context, [...path, 0])[0]
    if (conditionOperatorValue.raw) {
        return interpreteStep(value, step.children[1], context, [...path, 1])
    } else {
        return interpreteStep(value, step.children[2], context, [...path, 2])
    }
}

function interpreteSequential<T, I>(
    value: Value<T>[],
    step: ParsedSequantial,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    let newValue = value
    const newPath = path
    for (const [index, steps] of step.children.entries()) {
        newValue = interpreteStep(newValue, steps, context, [...newPath, index])
    }
    return newValue
}

/* function interpreteSequentialOperation<T, I>(
    value: Value<T>[],
    step: ParsedSequantial,
    context: InterpretionContext<T, I>,
    currentTime: number
): Value<T>[] {
    if (step.children.length > 0) {
        const newValue = interpreteStep(value, step.children[0], context)[0]
        const newTime = currentTime + 1
        if (step.children.length == 1 && !nextSteps) {
            resultsFinal.push(newValue)
        } else {
            const newParsedSequential: ParsedSequantial = { type: step.type, children: step.children.slice(1) }
            queue.push({ time: newTime, step: newParsedSequential, value: newValue })
        }
    }

    let newValue = value
    for (const steps of step.children) {
        newValue = interpreteStep(newValue, steps, context)
    }
    return newValue
} */

function interpreteBinaryOperator<T, I>(
    value: Value<T>[],
    step: ParsedBinaryOperator,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    // 5 + 10 | 20 = [15,25] moglich?
    const returnreval = value.map((val) => {
        const valuesOperatorFunction = step.children.map(
            (child, index) => interpreteStep([val], child, context, [...path, index])[0]
        )
        const returnVal = {
            ...val,
            raw: binaryOperations[step.type](valuesOperatorFunction[0].raw, valuesOperatorFunction[1].raw),
        }
        return returnVal
    })
    return returnreval
}

function interpreteOperation<T, I>(
    value: Value<T>[],
    step: ParsedOperation,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const parameters = step.children
    const operation = context.operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    const parameterOperatorFunctions = parameters.map(
        (parameter, index) => interpreteStep(value, parameter, context, [...path, index])[0]
    )

    const newValue: Value<T>[] = []

    value.map((v) => {
        const copy = [...parameterOperatorFunctions]
        if (operation.includeThis) {
            copy.unshift(v)
        }
        newValue.push(...operation.execute(toValue(copy.map((v) => v.raw))))
    })
    return newValue
}

function interpreteRaw<T>(value: Value<T>[], step: ParsedRaw, path: Array<number | string>): Value<T>[] {
    return value.map((val) => {
        return {
            ...val,
            raw: step.value,
        }
    })
}

export const unaryOperations: { [Name in ParsedUnaryOperator["type"]]: (value: any) => any } = {
    invert: (value) => -value,
    not: (value) => !value,
}

function interpreteUnaryOperator<T, I>(
    value: Value<T>[],
    step: ParsedUnaryOperator,
    context: InterpretionContext<T, I>,
    path: Array<number | string>
): Value<T>[] {
    const valueOperatorFunction = interpreteStep(value, step.children[0], context, [...path, 0])[0]
    return value.map((val) => {
        return {
            ...val,
            raw: unaryOperations[step.type](valueOperatorFunction.raw),
        }
    })
}

export const binaryOperations: { [Name in ParsedBinaryOperator["type"]]: (v1: any, v2: any) => any } = {
    add: (v1, v2) => v1 + v2,
    and: (v1, v2) => v1 && v2,
    divide: (v1, v2) => v1 / v2,
    equal: (v1, v2) => v1 == v2,
    greater: (v1, v2) => v1 > v2,
    greaterEqual: (v1, v2) => v1 >= v2,
    modulo: (v1, v2) => v1 % v2,
    multiply: (v1, v2) => v1 * v2,
    or: (v1, v2) => v1 || v2,
    smaller: (v1, v2) => v1 < v2,
    smallerEqual: (v1, v2) => v1 <= v2,
    subtract: (v1, v2) => v1 - v2,
    unequal: (v1, v2) => v1 != v2,
}

//array of value<T>?
export function toValue<T>(primitive: T, index?: Array<number>, variables?: Value<T>["variables"][]): Value<T> {
    return {
        raw: primitive,
        index: index ?? [],
        variables: variables ?? {},
        symbolDepth: {},
    }
}

function interpreteThis<T>(value: Value<T>[]): Value<T>[] {
    return value
}

export const _32bit_max_int = Math.pow(2, 32)