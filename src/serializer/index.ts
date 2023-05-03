import {
    ParsedBinaryOperator,
    ParsedDescription,
    ParsedDescriptions,
    ParsedGetVariable,
    ParsedIf,
    ParsedNoun,
    ParsedNounReference,
    ParsedNull,
    ParsedOperation,
    ParsedParallel,
    ParsedRaw,
    ParsedReturn,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedStochasticSwitch,
    ParsedSwitch,
    ParsedThis,
    ParsedTransformation,
    ParsedUnaryOperator,
} from "../index.js"
import { requiresBracket } from "./precendence.js"

export type Serializer<T> = {
    fromText: (text: string, forAstId: string) => T
    resolveNounReferenceAstEntry: (astId: string, fromDescriptionId: string, forAstId: string) => T
    resolveAstEntry: (
        astId: string,
        parentTransformation: ParsedTransformation | undefined,
        descriptionId: string,
        indentation: number
    ) => T
    join: (...values: Array<T>) => T
    getWhitespace: (indentation: number, ...astIds: Array<string>) => T
}

export function createDescriptionSerializeFunction<T>(
    fromText: (text: string, forAstId: string) => T,
    resolveAstEntry: (
        astId: string,
        serializeTransformation: (transformation: ParsedTransformation, decendentsDepth: number) => T,
        serializeNoun: (noun: ParsedNoun, decendentsDepth: number) => T,
        serializeDescription: (description: ParsedDescription, allNounIds: Array<string>) => T
    ) => T,
    resolveNounName: (astId: string, fromDescriptionId: string, forAstId: string) => T,
    join: (...values: Array<T>) => T,
    getWhitespace: (indentation: number, ...astIds: Array<string>) => T
): (astId: string) => T {
    const serializer: Serializer<T> = {
        fromText,
        join,
        resolveNounReferenceAstEntry: resolveNounName,
        getWhitespace,
        resolveAstEntry: (astId, parentTransformation, descriptionId, indentation) =>
            resolveAstEntry(
                astId,
                (transformation, decendentsDepth) =>
                    serializeChildWithBrackets(
                        astId,
                        transformation,
                        descriptionId,
                        parentTransformation,
                        serializer,
                        indentation,
                        decendentsDepth
                    ),
                (noun, depth) => serializeNoun(astId, noun, descriptionId, serializer, indentation, depth),
                (description, allNounIds) =>
                    serializeDescription(astId, description, allNounIds, serializer, indentation, 0)
            ),
    }
    return (descriptionId) => serializer.resolveAstEntry(descriptionId, undefined, descriptionId, 0)
}

export function serializeString(parsedDescriptions: ParsedDescriptions): string {
    const nounStringifyFunction = createDescriptionSerializeFunction<string>(
        (text) => text,
        (astId, serializeTransformation, serializeNoun, serializeDescription) => {
            switch (astId[0]) {
                case "t":
                    return serializeTransformation(parsedDescriptions.transformations[astId], 0)
                case "n":
                    return serializeNoun(parsedDescriptions.nouns[astId], 0)
                case "d":
                    return serializeDescription(
                        parsedDescriptions.descriptions[astId],
                        Object.entries(parsedDescriptions.nouns)
                            .filter(([, noun]) => noun.descriptionId === astId)
                            .map(([nounId]) => nounId)
                    )
                default:
                    throw new Error(`unknown type of ast id "${astId}"`)
            }
        },
        (astId, fromDescriptionId) => {
            const noun = parsedDescriptions.nouns[astId]
            if (noun.descriptionId === fromDescriptionId) {
                return noun.identifier
            }
            return `${parsedDescriptions.descriptions[noun.descriptionId].identifier}.${noun.identifier}`
        },
        (...values) => values.join(""),
        () => " "
    )
    return Object.keys(parsedDescriptions.descriptions).map(nounStringifyFunction).join("\n\n")
}

function serializeDescription<T>(
    astId: string,
    description: ParsedDescription,
    allNounIds: Array<string>,
    serializer: Serializer<T>,
    indentation: number,
    decendentsDepth: number
): T {
    const initialVariableEntries = Object.entries(description.initialVariables)
    const innerWhitespace = serializer.getWhitespace(indentation + 1, astId)
    return serializer.join(
        serializer.fromText(
            `${description.identifier} (${initialVariableEntries
                .map(([identifier, value]) => `${identifier}: ${serializeConstant(value)}`)
                .join(", ")}) {`,
            astId
        ),
        innerWhitespace,
        serializer.resolveAstEntry(description.rootNounId, undefined, astId, indentation + 1),
        innerWhitespace,
        ...insertBetweenAll(
            allNounIds
                .filter((id) => id != description.rootNounId)
                .map((nounId) => serializer.resolveAstEntry(nounId, undefined, astId, indentation + 1)),
            innerWhitespace
        ),
        serializer.fromText("}", astId)
    )
}

function serializeNoun<T>(
    astId: string,
    noun: ParsedNoun,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number,
    decendentsDepth: number
): T {
    return serializer.join(
        serializer.fromText(`${noun.identifier} -->`, astId),
        serializer.getWhitespace(indentation + 1, noun.tansformationId),
        serializer.resolveAstEntry(noun.tansformationId, undefined, descriptionId, indentation + 1)
    )
}

function serializeTransformation<T>(
    astId: string,
    transformation: ParsedTransformation,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number,
    decendentsDepth: number
): T {
    switch (transformation.type) {
        case "operation":
            return serializeOperation(astId, transformation, descriptionId, serializer, indentation)
        case "parallel":
            return serializeParallel(astId, transformation, descriptionId, serializer, indentation)
        case "raw":
            return serializeRaw(astId, transformation, descriptionId, serializer, indentation)
        case "sequential":
            return serializeSequentialAbstract(astId, transformation, descriptionId, serializer, indentation)
        case "nounReference":
            return serializeSymbolAbstract(astId, transformation, descriptionId, serializer, indentation)
        case "this":
            return serializeThisAbstract(astId, transformation, descriptionId, serializer, indentation)
        case "-()":
        case "!":
            return serializeUnaryOperator(astId, transformation, descriptionId, serializer, indentation)
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
            return serializeBinaryOperator(astId, transformation, descriptionId, serializer, indentation)
        case "if":
            return serializeIf(astId, transformation, descriptionId, serializer, indentation)
        case "switch":
            return serializeSwitch(astId, transformation, descriptionId, serializer, indentation)
        case "getVariable":
            return serializeGetVariable(astId, transformation, descriptionId, serializer, indentation)
        case "setVariable":
            return serializeSetVariable(astId, transformation, descriptionId, serializer, indentation)
        case "return":
            return serializeReturn(astId, transformation, descriptionId, serializer, indentation)
        case "stochasticSwitch":
            return serializeStochasticSwitch(astId, transformation, descriptionId, serializer, indentation)
        case "null":
            return serializeNull(astId, transformation, descriptionId, serializer, indentation)
    }
}

function serializeChildWithBrackets<T>(
    astId: string,
    transformation: ParsedTransformation,
    descriptionId: string,
    parentTransformation: ParsedTransformation | undefined,
    serializer: Serializer<T>,
    indentation: number,
    decendentsDepth: number
): T {
    if (parentTransformation != null && requiresBracket(parentTransformation, transformation)) {
        return serializer.join(
            serializer.fromText("(", astId),
            serializer.getWhitespace(indentation + 1, astId),
            serializeTransformation(astId, transformation, descriptionId, serializer, indentation + 1, decendentsDepth),
            serializer.getWhitespace(indentation, astId),
            serializer.fromText(")", astId)
        )
    }
    return serializeTransformation(astId, transformation, descriptionId, serializer, indentation, decendentsDepth)
}

function serializeStochasticSwitch<T>(
    astId: string,
    transformation: ParsedStochasticSwitch,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    if (transformation.childrenIds.length != transformation.probabilities.length) {
        throw new Error(`stochastic switch must have the same amount of childrens as the amount of probabilities`)
    }
    const whitespace = serializer.getWhitespace(indentation, astId)
    const innerWhitespace = serializer.getWhitespace(indentation + 1, astId)
    return serializer.join(
        serializer.fromText("{", astId),
        ...transformation.childrenIds
            .map((childAstId, i) => [
                innerWhitespace,
                serializer.fromText(`${toFixedMax(transformation.probabilities[i] * 100, 2)}%:`, childAstId),
                innerWhitespace,
                serializer.resolveAstEntry(childAstId, transformation, descriptionId, indentation + 1),
            ])
            .reduce<Array<T>>((v1, v2) => v1.concat(v2), []),

        whitespace,
        serializer.fromText("}", astId)
    )
}

function toFixedMax(value: number, max: number): string {
    const multiplier = Math.pow(10, max)
    return (Math.round(value * multiplier) / multiplier).toString()
}

function serializeUnaryOperator<T>(
    astId: string,
    transformation: ParsedUnaryOperator,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    switch (transformation.type) {
        case "-()":
            return serializer.join(
                serializer.fromText(`-`, astId),
                serializer.resolveAstEntry(transformation.childrenIds[0], transformation, descriptionId, indentation)
            )
        case "!":
            return serializer.join(
                serializer.fromText(`!`, astId),
                serializer.resolveAstEntry(transformation.childrenIds[0], transformation, descriptionId, indentation)
            )
    }
}

function serializeBinaryOperator<T>(
    astId: string,
    transformation: ParsedBinaryOperator,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.join(
        serializer.resolveAstEntry(transformation.childrenIds[0], transformation, descriptionId, indentation),
        serializer.fromText(` ${transformation.type} `, astId),
        serializer.resolveAstEntry(transformation.childrenIds[1], transformation, descriptionId, indentation)
    )
}

function serializeReturn<T>(
    astId: string,
    transformation: ParsedReturn,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.fromText("return", astId)
}

function serializeNull<T>(
    astId: string,
    transformation: ParsedNull,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.fromText("null", astId)
}

function serializeGetVariable<T>(
    astId: string,
    transformation: ParsedGetVariable,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.fromText(`this.${transformation.identifier}`, astId)
}

function serializeSetVariable<T>(
    astId: string,
    transformation: ParsedSetVariable,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.join(
        serializer.fromText(`this.${transformation.identifier} =`, astId),
        serializer.getWhitespace(indentation + 1, transformation.childrenIds[0]),
        serializer.resolveAstEntry(transformation.childrenIds[0], transformation, descriptionId, indentation + 1)
    )
}

function serializeOperation<T>(
    astId: string,
    transformation: ParsedOperation,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    const outerWhitespace = serializer.getWhitespace(indentation, astId)
    const innerWhitespace = serializer.getWhitespace(indentation + 1, astId)
    return serializer.join(
        serializer.fromText(`${transformation.identifier}(`, astId),
        ...insertBetweenAll(
            transformation.childrenIds.map((childAstId) =>
                serializer.join(
                    innerWhitespace,
                    serializer.resolveAstEntry(childAstId, transformation, descriptionId, indentation + 1)
                )
            ),
            serializer.fromText(",", astId)
        ),
        outerWhitespace,
        serializer.fromText(")", astId)
    )
}

function serializeIf<T>(
    astId: string,
    transformation: ParsedIf,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    const [conditionAstId, ifAstId, elseAstId] = transformation.childrenIds
    const conditionBeforeWhitespace = serializer.getWhitespace(indentation + 1, conditionAstId)
    const conditionAfterWhitespace = serializer.getWhitespace(indentation, conditionAstId)
    const ifElseBeforeWhitespace = serializer.getWhitespace(indentation + 1, ifAstId, elseAstId)
    const ifElseAfterWhitespace = serializer.getWhitespace(indentation, ifAstId, elseAstId)
    return serializer.join(
        serializer.fromText(`if`, astId),
        conditionBeforeWhitespace,
        serializer.resolveAstEntry(conditionAstId, transformation, descriptionId, indentation + 1),
        conditionAfterWhitespace,
        serializer.fromText(`then {`, astId),
        ifElseBeforeWhitespace,
        serializer.resolveAstEntry(ifAstId, transformation, descriptionId, indentation + 1),
        ifElseAfterWhitespace,
        serializer.fromText(`} else {`, astId),
        ifElseBeforeWhitespace,
        serializer.resolveAstEntry(elseAstId, transformation, descriptionId, indentation + 1),
        ifElseAfterWhitespace,
        serializer.fromText(`}`, astId)
    )
}

function serializeSwitch<T>(
    astId: string,
    transformation: ParsedSwitch,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    const whitespace = serializer.getWhitespace(indentation, astId)
    const caseWhitespace = serializer.getWhitespace(indentation + 1, astId)
    return serializer.join(
        serializer.fromText("switch", astId),
        serializer.getWhitespace(indentation + 1, transformation.childrenIds[0]),
        serializer.resolveAstEntry(transformation.childrenIds[0], transformation, descriptionId, indentation + 1),
        whitespace,
        serializer.fromText("{", astId),
        ...transformation.cases
            .map((caseValues, i) => [
                ...caseValues.reduce<Array<T>>(
                    (prev, caseValue) => [
                        ...prev,
                        caseWhitespace,
                        serializer.fromText(`case ${serializeConstant(caseValue)}:`, astId),
                    ],
                    []
                ),
                serializer.getWhitespace(indentation + 2, transformation.childrenIds[i + 1]),
                serializer.resolveAstEntry(
                    transformation.childrenIds[i + 1],
                    transformation,
                    descriptionId,
                    indentation + 2
                ),
            ])
            .reduce<Array<T>>((v1, v2) => v1.concat(v2), []),
        whitespace,
        serializer.fromText("}", astId)
    )
}

function serializeParallel<T>(
    astId: string,
    transformation: ParsedParallel,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    const whitespace = serializer.getWhitespace(indentation, astId)
    return serializer.join(
        ...insertBetweenAll(
            transformation.childrenIds.map((childAstId) =>
                serializer.resolveAstEntry(childAstId, transformation, descriptionId, indentation)
            ),
            serializer.join(serializer.fromText(" |", astId), whitespace)
        )
    )
}

function serializeRaw<T>(
    astId: string,
    transformation: ParsedRaw,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.fromText(serializeConstant(transformation.value), astId)
}

function serializeConstant(constant: string | number | boolean): string {
    switch (typeof constant) {
        case "string":
            return `"${constant}"`
        case "number":
            return `${Math.round(constant * 100) / 100}`
        case "boolean":
            return constant.toString()
        default:
            throw new Error(`constant "${constant}" of unexpected type`)
    }
}

function serializeSequentialAbstract<T>(
    astId: string,
    transformation: ParsedSequantial,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    const whitespace = serializer.getWhitespace(indentation, astId)
    return serializer.join(
        ...insertBetweenAll(
            transformation.childrenIds.map((childAstId) =>
                serializer.resolveAstEntry(childAstId, transformation, descriptionId, indentation)
            ),
            serializer.join(serializer.fromText(" ->", astId), whitespace)
        )
    )
}

function serializeSymbolAbstract<T>(
    astId: string,
    transformation: ParsedNounReference,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.resolveNounReferenceAstEntry(transformation.nounId, descriptionId, astId)
}

function serializeThisAbstract<T>(
    astId: string,
    transformation: ParsedThis,
    descriptionId: string,
    serializer: Serializer<T>,
    indentation: number
): T {
    return serializer.fromText("this", astId)
}

function insertBetweenAll<T, K>(array: Array<T>, insert: K): Array<K | T> {
    const result: Array<K | T> = []
    for (let i = 0; i < array.length; i++) {
        result.push(array[i])
        if (i < array.length - 1) {
            result.push(insert)
        }
    }
    return result
}
