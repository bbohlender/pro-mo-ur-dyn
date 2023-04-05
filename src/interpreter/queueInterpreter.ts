import { v3 } from "murmurhash"
import {
    binaryOperations,
    interpreteStep,
    InterpretionContext,
    queue,
    resultsFinal,
    toValue,
    unaryOperations,
    Value,
    _32bit_max_int,
} from "."
import {
    AbstractParsedRandom,
    AbstractParsedSteps,
    ParsedBinaryOperator,
    ParsedGetVariable,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRaw,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSwitch,
    ParsedSymbol,
    ParsedUnaryOperator,
} from "../parser"

export function interpreteQueueStep<T, I>(
    value: Value<T>,
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    translateQueueStep(value, step, context, path, nextOperations, currentTime)

    return
}

function translateQueueStep<T, I>(
    value: Value<T>,
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    switch (step.type) {
        case "operation":
            interpreteQueueOperation(value, step, context, path, nextOperations, currentTime)
            return
        case "parallel":
            interpreteQueueParallel(value, step, context, path, nextOperations, currentTime)
            return
        case "raw":
            interpreteQueueRaw(value, step, context, path, nextOperations, currentTime)
            return
        case "sequential":
            interpreteQueueSequential(value, step, context, path, nextOperations, currentTime)
            return
        case "symbol":
            interpreteQueueSymbol(value, step, context, path, nextOperations, currentTime)
            return
        case "this":
            finishOrContinue(value, context, path, nextOperations, currentTime)
            return
        case "invert":
        case "not":
            interpreteQuereyUnaryOperator(value, step, context, path, nextOperations, currentTime)
            return
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
            interpreteBinaryOperator(value, step, context, path, nextOperations, currentTime)
            return
        case "if":
            interpreteQuereyIf(value, step, context, path, nextOperations, currentTime)
            return
        case "switch":
            interpreteQuereySwitch(value, step, context, path, nextOperations, currentTime)
            return
        case "getVariable":
            interpreteQuereyGetVariable(value, step, context, path, nextOperations, currentTime)
            return
        case "setVariable":
            interpreteQuereySetVariable(value, step, context, path, nextOperations, currentTime)
            return
        case "random":
            interpreteQuereyRandom(value, step, context, path, nextOperations, currentTime)
            return
    }
}

function interpreteQuereyRandom<T, A, I>(
    value: Value<T>,
    step: AbstractParsedRandom<I>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    const stepProb: number[] = []
    for (let i = 0; i < step.probabilities.length; i++) {
        if (i == 0) {
            stepProb.push(step.probabilities[i])
        } else {
            stepProb.push(step.probabilities[i] + stepProb[stepProb.length - 1])
        }
    }
    const rand = v3(value.index.join(","), context.seed) / _32bit_max_int
    //const rand = Math.random()
    const stepIndex = stepProb.findIndex((e) => rand <= e)
    if (stepIndex !== -1) {
        if (context.listeners?.onRandom != null) {
            const onRandom = context.listeners.onRandom
            onRandom(step, value, stepIndex)
        }
        interpreteQueueStep(value, step.children[stepIndex], context, [...path, stepIndex], nextOperations, currentTime)
        return
    }
}

function interpreteQuereyGetVariable<T, I>(
    value: Value<T>,
    step: ParsedGetVariable,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    finishOrContinue(value.variables[step.identifier], context, path, nextOperations, currentTime)
}

function interpreteQuereySetVariable<T, I>(
    value: Value<T>,
    step: ParsedSetVariable,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    const valueOperatorFunction = interpreteStep([value], step.children[0], context, [...path, 0])
    finishOrContinue(
        { ...value, variables: { ...value.variables, [step.identifier]: valueOperatorFunction } }.variables[
            step.identifier
        ],
        context,
        path,
        nextOperations,
        currentTime
    )
}

function interpreteQuereySwitch<T, I>(
    value: Value<T>,
    step: ParsedSwitch,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    //const valueOperator = interpreteStep(value, step.children[0], context)[0]
    //const casesOperatorFunctions = step.children.slice(1).map((child) => interpreteStep(child, context, next))
    const conditionOperatorValue = interpreteStep([value], step.children[0], context, [...path, 0])[0]
    for (let i = 0; i < step.cases.length; i++) {
        const currentStep = step.cases[i]
        if (currentStep.some((e) => e === conditionOperatorValue.raw)) {
            const newNextStepsChildren = nextOperations.children
            newNextStepsChildren.unshift(step.children[i + 1])
            finishOrContinue(
                value,
                context,
                path,
                {
                    ...nextOperations,
                    children: newNextStepsChildren,
                },
                currentTime
            )
            return
        }
    }
}

function interpreteQuereyIf<T, I>(
    value: Value<T>,
    step: ParsedIf,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    const conditionOperatorValue = interpreteStep([value], step.children[0], context, [...path, 0])[0]
    if (conditionOperatorValue.raw) {
        const newNextStepsChildren = nextOperations.children
        newNextStepsChildren.unshift(step.children[0])
        finishOrContinue(
            value,
            context,
            path,
            {
                ...nextOperations,
                children: newNextStepsChildren,
            },
            currentTime
        )
    } else {
        const newNextStepsChildren = nextOperations.children
        newNextStepsChildren.unshift(step.children[1])
        finishOrContinue(
            value,
            context,
            path,
            {
                ...nextOperations,
                children: newNextStepsChildren,
            },
            currentTime
        )
    }
}

function interpreteQueueSymbol<T, I>(
    value: Value<T>,
    step: ParsedSymbol,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    if ((value.index.length ?? 0) >= context.maxSymbolDepth) {
        throw new Error(`maximum symbol depth (${context.maxSymbolDepth}) reached for symbol "${step.identifier}"`)
    }

    const grammar = context.grammar.find((v) => v.name === step.identifier)
    if (!grammar) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    nextOperations.children.unshift(grammar.step)

    finishOrContinue(
        value,
        context,
        path,
        {
            ...nextOperations,
            children: nextOperations.children,
        },
        currentTime
    )
}

function interpreteQuereyUnaryOperator<T, I>(
    value: Value<T>,
    step: ParsedUnaryOperator,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    const valueOperatorFunction = interpreteStep([value], step.children[0], context, [...path, 0])[0]

    finishOrContinue(
        {
            ...value,
            raw: unaryOperations[step.type](valueOperatorFunction.raw),
        },
        context,
        path,
        nextOperations,
        currentTime
    )
}

function interpreteBinaryOperator<T, I>(
    value: Value<T>,
    step: ParsedBinaryOperator,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    // 5 + 10 | 20 = [15,25] moglich?
    const valuesOperatorFunction = step.children.map(
        (child, index) => interpreteStep([value], child, context, [...path, index])[0]
    )

    finishOrContinue(
        {
            ...value,
            raw: binaryOperations[step.type](valuesOperatorFunction[0].raw, valuesOperatorFunction[1].raw),
        },
        context,
        path,
        nextOperations,
        currentTime
    )
}

function interpreteQueueRaw<T, I>(
    value: Value<T>,
    step: ParsedRaw,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    finishOrContinue(
        {
            ...value,
            raw: step.value,
        },
        context,
        path,
        nextOperations,
        currentTime
    )
}

function interpreteQueueSequential<T, I>(
    value: Value<T>,
    step: ParsedSequantial,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    interpreteQueueStep(
        value,
        step.children[0],
        context,
        [...path, 0],
        {
            ...nextOperations,
            children: step.children.slice(1).concat(nextOperations.children),
        },
        currentTime
    )
}

function interpreteQueueParallel<T, I>(
    value: Value<T>,
    step: ParsedParallel,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    for (const [index, steps] of step.children.entries()) {
        interpreteQueueStep(value, steps, context, [...path, index], nextOperations, currentTime)
    }
}

function interpreteQueueOperation<T, I>(
    value: Value<T>,
    step: ParsedOperation,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    currentTime: number
) {
    const parameters = step.children
    const operation = context.operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    const parameterOperatorFunctions = parameters.map(
        (parameter, index) => interpreteStep([value], parameter, context, [...path, index])[0]
    )
    const newValue: Value<T>[] = []

    const copy = [...parameterOperatorFunctions]
    if (operation.includeThis) {
        copy.unshift(value)
    }
    let time = currentTime
    newValue.push(...operation.execute(toValue(copy.map((v) => v.raw))))
    const singleVal = newValue[0].raw
    if (typeof singleVal === "object" && !Array.isArray(singleVal) && singleVal !== null) {
        if ("time" in singleVal) {
            time = (singleVal as any).time as number
        }
    }

    if (operation.changesTime) {
        if (nextOperations.children.length > 0) {
            queue.push({ time: time + 1, value: newValue[0], step: nextOperations })
            queue.sort((a, b) => a.time - b.time)
        } else {
            resultsFinal.push(...newValue)
        }
    } else {
        finishOrContinue(newValue[0], context, path, nextOperations, currentTime)
    }

    return
}

function finishOrContinue<T, I>(
    value: Value<T>,
    context: InterpretionContext<T, I>,
    path: Array<number | string>,
    nextOperations: ParsedSequantial,
    time: number
) {
    if (nextOperations.children.length > 0) {
        const nextStep = nextOperations.children[0]
        const otherSteps = { ...nextOperations, children: nextOperations.children.slice(1) }
        interpreteQueueStep(value, nextStep, context, path, otherSteps, time)
    } else {
        resultsFinal.push(value)
    }
}
