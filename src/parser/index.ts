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
        for (const noun of Object.values(description.nouns)) {
            setDescriptionIdentifier(noun.transformation, identifier)
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
    if (transformation.type === "nounReference" && transformation.descriptionIdentifier == null) {
        transformation.descriptionIdentifier = identifier
    }
}

/*function traverseDown(description: ParsedDescriptions, astId: string, onTransformation: () => void): void {
    switch (astId[0]) {
        case "t":
            description.transformations[astId]
    }
}*/

export function traverseDownNestedDescription(
    description: NestedDescription,
    onTransformation: (transformation: NestedTransformation) => NestedTransformation,
    onNoun: (noun: NestedNoun) => NestedNoun,
    onDescription: (description: NestedDescription) => NestedDescription
): NestedDescription {
    const result = onDescription(description)
    for (const [identifier, noun] of Object.entries(description.nouns)) {
        description.nouns[identifier] = traverseDownNestedNoun(noun, onTransformation, onNoun)
    }
    return result
}

export function traverseDownNestedNoun(
    noun: NestedNoun,
    onTransformation: (transformation: NestedTransformation) => NestedTransformation,
    onNoun: (noun: NestedNoun) => NestedNoun
): NestedNoun {
    const result = onNoun(noun)
    noun.transformation = traverseDownNestedTransformation(noun.transformation, onTransformation)
    return result
}

export function traverseDownNestedTransformation(
    transformation: NestedTransformation,
    onTransformation: (transformation: NestedTransformation) => NestedTransformation
): NestedTransformation {
    const result = onTransformation(transformation)
    if (!("children" in transformation)) {
        return transformation
    }
    for (let i = 0; i < transformation.children.length; i++) {
        transformation.children[i] = traverseDownNestedTransformation(transformation.children[i], onTransformation)
    }
    return result
}

export function traverseUpParsed(
    descriptions: ParsedDescriptions,
    astId: string,
    onTransformation: (id: string, transformation: ParsedTransformation) => void,
    onNoun: (id: string, noun: ParsedNoun) => void,
    onDescription: (id: string, description: ParsedDescription) => void,
    visited = new Set<string>()
): void {
    if (visited.has(astId)) {
        return
    }
    visited.add(astId)
    const nounReferenceTuple = Object.entries(descriptions.transformations).find(
        ([, transformation]) => transformation.type === "nounReference" && transformation.nounId === astId
    )
    if (nounReferenceTuple != null) {
        onTransformation(...nounReferenceTuple)
        traverseUpParsed(descriptions, nounReferenceTuple[0], onTransformation, onNoun, onDescription, visited)
    }

    const transformationTuple = Object.entries(descriptions.transformations).find(
        ([, transformation]) => "childrenIds" in transformation && transformation.childrenIds.includes(astId)
    )
    if (transformationTuple != null) {
        onTransformation(...transformationTuple)
        traverseUpParsed(descriptions, transformationTuple[0], onTransformation, onNoun, onDescription, visited)
    }

    const nounTuple = Object.entries(descriptions.nouns).find(([, noun]) => noun.tansformationId === astId)
    if (nounTuple != null) {
        onNoun(...nounTuple)
        traverseUpParsed(descriptions, nounTuple[0], onTransformation, onNoun, onDescription, visited)
    }

    const descriptionTuple = Object.entries(descriptions.descriptions).find(
        ([, description]) => description.rootNounId === astId
    )
    if (descriptionTuple != null) {
        onDescription(...descriptionTuple)
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
}
export type ParsedRaw = {
    type: "raw"
    value: any
    astId?: string
}
export type ParsedThis = {
    type: "this"
    astId?: string
}
export type ParsedReturn = {
    type: "return"
    astId?: string
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
    descriptionId: string
}

export type NestedDescriptions = { [Identifier in string]: NestedDescription }
export type NestedDescription = {
    rootNounIdentifier: string
    nouns: { [Identifier in string]: NestedNoun }
    initialVariables: { [Name in string]: any }
    astId?: string
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

export type NestedNoun = {
    transformation: NestedTransformation
    astId?: string
}

export type NestedNounReference = {
    type: "nounReference"
    nounIdentifier: string
    descriptionIdentifier: string
    astId?: string
}
export type NestedParallel = {
    type: "parallel"
    children: Array<NestedTransformation>
    astId?: string
}
export type NestedSequantial = {
    type: "sequential"
    children: Array<NestedTransformation>
    astId?: string
}
export type NestedOperation = {
    type: "operation"
    children: Array<NestedTransformation>
    identifier: string
    astId?: string
}
export type NestedPrecomputedOperation = {
    type: "precomputedOperation"
    parameters: Array<any>
    identifier: string
    astId?: string
}
export type NestedUnaryOperator = {
    type: "!" | "-()"
    children: [value: NestedTransformation]
    astId?: string
}
export type NestedStochasticSwitch = {
    type: "stochasticSwitch"
    probabilities: Array<number> //should add up to ~1
    children: Array<NestedTransformation>
    astId?: string
}
export type NestedNull = {
    type: "null"
    astId?: string
}
export type NestedBinaryOperator = {
    type: "+" | "-" | "*" | "/" | "%" | "&&" | "||" | "==" | "!=" | "<" | "<=" | ">" | ">="
    children: [op1: NestedTransformation, op2: NestedTransformation]
    astId?: string
}
export type NestedIf = {
    type: "if"
    children: [condition: NestedTransformation, ifValue: NestedTransformation, elseValue: NestedTransformation]
    astId?: string
}
export type NestedSwitch = {
    type: "switch"
    cases: Array<Array<any>>
    children: Array<NestedTransformation>
    astId?: string
}
export type NestedSetVariable = {
    type: "setVariable"
    identifier: string
    children: [value: NestedTransformation]
    astId?: string
}
export type NestedGetVariable = {
    type: "getVariable"
    identifier: string
    astId?: string
}

export * from "./structure.js"
