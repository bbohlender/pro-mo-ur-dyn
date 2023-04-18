import pkg from "nearley"
const { Grammar, Parser } = pkg
import grammar from "./parser.js"

const G = Grammar.fromCompiled(grammar)

export function parse(text: string): NestedDescriptions {
    const parser = new Parser(G, {
        keepHistory: false,
    })
    parser.feed(text)
    if (parser.results.length === 0) {
        throw new Error("unexpected end of input")
    }
    const descriptions: NestedDescriptions = parser.results[0]
    for (const [identifier, description] of Object.entries(descriptions)) {
        for (const transformation of Object.values(description.nouns)) {
            setDescriptionIdentifier(transformation, identifier)
        }
    }
    return descriptions
}

function setDescriptionIdentifier(transformation: NestedTransformation, identifier: string) {
    if ("children" in transformation) {
        for (const child of transformation.children) {
            setDescriptionIdentifier(child, identifier)
        }
        return
    }
    if (transformation.type === "nounReference") {
        transformation.descriptionIdentifier = identifier
    }
}

export type ParsedTransformation =
    | ParsedParallel
    | ParsedSequantial
    | ParsedOperation
    | ParsedNounReference
    | ParsedRaw
    | ParsedThis
    | ParsedBinaryOperator
    | ParsedUnaryOperator
    | ParsedIf
    | ParsedSwitch
    | ParsedSetVariable
    | ParsedGetVariable
    | ParsedReturn
    | ParsedStochasticSwitch
    | ParsedNull

export type ParsedParallel = {
    type: "parallel"
    childrenIds: Array<string>
}

export type ParsedSequantial = {
    type: "sequential"
    childrenIds: Array<string>
}
export type ParsedOperation = {
    type: "operation"
    childrenIds: Array<string>
    identifier: string
}
export type ParsedNounReference = {
    type: "nounReference"
    nounId: string
    descriptionId?: string
}
export type ParsedRaw = {
    type: "raw"
    value: any
    id?: string
}
export type ParsedThis = {
    type: "this"
    id?: string
}
export type ParsedReturn = {
    type: "return"
    id?: string
}
export type ParsedUnaryOperator = {
    type: "!" | "-()"
    childrenIds: [valueId: string]
}
export type ParsedStochasticSwitch = {
    type: "stochasticSwitch"
    probabilities: Array<number> //should add up to ~1
    childrenIds: Array<string>
}
export type ParsedNull = {
    type: "null"
}
export type ParsedBinaryOperator = {
    type: "+" | "-" | "*" | "/" | "%" | "&&" | "||" | "==" | "!=" | "<" | "<=" | ">" | ">="
    childrenIds: [op1: string, op2: string]
}
export type ParsedIf = {
    type: "if"
    childrenIds: [conditionId: string, ifValueId: string, elseValueId: string]
}
export type ParsedSwitch = {
    type: "switch"
    cases: Array<Array<any>>
    childrenIds: Array<string>
}
export type ParsedSetVariable = {
    type: "setVariable"
    identifier: string
    childrenIds: [valueId: string]
}
export type ParsedGetVariable = {
    type: "getVariable"
    identifier: string
}

export type ParsedDescriptions = {
    descriptions: { [Id in string]: ParsedDescription }
    transformations: { [Id in string]: ParsedTransformation }
    nouns: { [Id in string]: ParsedNoun }
}

export type ParsedDescription = {
    identifier: string
    rootNounId: string
    initialVariables: { [Name in string]: any }
}
export type ParsedNoun = {
    identifier: string
    tansformationId: string
}

export type NestedDescriptions = { [Identifier in string]: NestedDescription }
export type NestedDescription = {
    rootNounIdentifier: string
    nouns: { [Identifier in string]: NestedTransformation }
    initialVariables: { [Name in string]: any }
}

export type NestedTransformation =
    | NestedParallel
    | NestedSequantial
    | NestedOperation
    | NestedPrecomputedOperation
    | NestedNounReference
    | ParsedRaw
    | ParsedThis
    | NestedBinaryOperator
    | NestedUnaryOperator
    | NestedIf
    | NestedSwitch
    | NestedSetVariable
    | NestedGetVariable
    | ParsedReturn
    | NestedStochasticSwitch
    | NestedNull

export type NestedNounReference = {
    type: "nounReference"
    nounIdentifier: string
    descriptionIdentifier: string
    id?: string
}
export type NestedParallel = {
    type: "parallel"
    children: Array<NestedTransformation>
    id?: string
}
export type NestedSequantial = {
    type: "sequential"
    children: Array<NestedTransformation>
    id?: string
}
export type NestedOperation = {
    type: "operation"
    children: Array<NestedTransformation>
    identifier: string
    id?: string
}
export type NestedPrecomputedOperation = {
    type: "precomputedOperation"
    children: Array<any>
    identifier: string
    id?: string
}
export type NestedUnaryOperator = {
    type: "!" | "-()"
    children: [value: NestedTransformation]
    id?: string
}
export type NestedStochasticSwitch = {
    type: "stochasticSwitch"
    probabilities: Array<number> //should add up to ~1
    children: Array<NestedTransformation>
    id?: string
}
export type NestedNull = {
    type: "null"
    id?: string
}
export type NestedBinaryOperator = {
    type: "+" | "-" | "*" | "/" | "%" | "&&" | "||" | "==" | "!=" | "<" | "<=" | ">" | ">="
    children: [op1: NestedTransformation, op2: NestedTransformation]
    id?: string
}
export type NestedIf = {
    type: "if"
    children: [condition: NestedTransformation, ifValue: NestedTransformation, elseValue: NestedTransformation]
    id?: string
}
export type NestedSwitch = {
    type: "switch"
    cases: Array<Array<any>>
    children: Array<NestedTransformation>
    id?: string
}
export type NestedSetVariable = {
    type: "setVariable"
    identifier: string
    children: [value: NestedTransformation]
    id?: string
}
export type NestedGetVariable = {
    type: "getVariable"
    identifier: string
    id?: string
}
