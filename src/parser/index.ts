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
    return parser.results[0]
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
}
export type ParsedRaw = {
    type: "raw"
    value: any
}
export type ParsedThis = {
    type: "this"
}
export type ParsedReturn = {
    type: "return"
}
export type ParsedUnaryOperator = {
    type: "!" | "-"
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
    descriptions: Array<ParsedDescription>
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

export type NestedDescriptions = Array<NestedDescription>
export type NestedDescription = {
    identifier: string
    rootNounIdentifier: string
    nouns: { [Identifier in string]: NestedTransformation }
    initialVariables: { [Name in string]: any }
}

export type NestedTransformation =
    | NestedParallel
    | NestedSequantial
    | NestedOperation
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
}
export type NestedParallel = {
    type: "parallel"
    children: Array<NestedTransformation>
}
export type NestedSequantial = {
    type: "sequential"
    children: Array<NestedTransformation>
}
export type NestedOperation = {
    type: "operation"
    children: Array<NestedTransformation>
    identifier: string
}
export type NestedUnaryOperator = {
    type: "!" | "-"
    children: [value: NestedTransformation]
}
export type NestedStochasticSwitch = {
    type: "stochasticSwitch"
    probabilities: Array<number> //should add up to ~1
    children: Array<NestedTransformation>
}
export type NestedNull = {
    type: "null"
}
export type NestedBinaryOperator = {
    type: "+" | "-" | "*" | "/" | "%" | "&&" | "||" | "==" | "!=" | "<" | "<=" | ">" | ">="
    children: [op1: NestedTransformation, op2: NestedTransformation]
}
export type NestedIf = {
    type: "if"
    children: [condition: NestedTransformation, ifValue: NestedTransformation, elseValue: NestedTransformation]
}
export type NestedSwitch = {
    type: "switch"
    cases: Array<Array<any>>
    children: Array<NestedTransformation>
}
export type NestedSetVariable = {
    type: "setVariable"
    identifier: string
    children: [value: NestedTransformation]
}
export type NestedGetVariable = {
    type: "getVariable"
    identifier: string
}