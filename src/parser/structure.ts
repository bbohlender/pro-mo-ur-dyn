import { generateUUID } from "three/src/math/MathUtils.js"
import { ParsedDescription, ParsedDescriptions, NestedDescriptions, NestedTransformation, NestedDescription } from "./index.js"

export function flattenAST(nestedDescriptions: NestedDescriptions): ParsedDescriptions {
    const transformations: ParsedDescriptions["transformations"] = {}
    const nouns: ParsedDescriptions["nouns"] = {}
    const nounIdentifierIdMap = new Map<string, string>()
    const descriptions = nestedDescriptions.map<ParsedDescription>(({ initialVariables, identifier, nouns: nestedNouns, rootNounIdentifier }) => {
        for(const [nounIdentifier, transformation] of Object.entries(nestedNouns)) {
            nouns[getNounId(nounIdentifier, nounIdentifierIdMap)] = {
                identifier: nounIdentifier,
                tansformationId: flattenTransformation(transformation, transformations, nounIdentifierIdMap)
            }
        }
        return {
            initialVariables,
            identifier,
            rootNounId: getNounId(rootNounIdentifier, nounIdentifierIdMap)
        }
    })
    return {
        nouns,
        descriptions,
        transformations
}
}

function getNounId(identifier: string, nounIdentifierIdMap: Map<string, string>): string {
    const id = nounIdentifierIdMap.get(identifier)
    if(id != null) {
        return id
    }
    const newId = generateUUID()
    nounIdentifierIdMap.set(identifier, newId)
    return newId
}

function flattenTransformation(nestedTransformation: NestedTransformation, transformations: ParsedDescriptions["transformations"], nounIdentifierIdMap: Map<string, string>): string {
    const transformationId = generateUUID()
    if(nestedTransformation.type === "nounReference") {
        transformations[transformationId] = {
            type: "nounReference",
            nounId: getNounId(nestedTransformation.nounIdentifier, nounIdentifierIdMap)
        }
        return transformationId
    }
    if("children" in nestedTransformation && Array.isArray(nestedTransformation.children)) {
        const { children, ...rest } = nestedTransformation
        transformations[transformationId] = {
            childrenIds: children.map(child => flattenTransformation(child, transformations, nounIdentifierIdMap)),
            ...rest
        } as any
    } else {
        transformations[transformationId] = nestedTransformation as any
    }
    return transformationId
    
}

export function nestAST({ descriptions, nouns: parsedNouns, transformations }: ParsedDescriptions): NestedDescriptions {
    return descriptions.map(({ initialVariables, identifier, rootNounId }) => {
        const nouns: NestedDescription["nouns"] = {}
        for(const { tansformationId, identifier: nounIdentifier } of Object.values(parsedNouns)) {
            nouns[nounIdentifier] = nestTransformation(tansformationId, transformations, parsedNouns)
        }
        const rootNoun = parsedNouns[rootNounId]
        if(rootNoun == null) {
            throw new Error(`unknown noun "${rootNounId}"`)
        }
        return {
            initialVariables,
            identifier,
            nouns,
            rootNounIdentifier: rootNoun.identifier
        }
    })
}

export function nestTransformation(id: string, transformations: ParsedDescriptions["transformations"], nouns: ParsedDescriptions["nouns"]): NestedTransformation {
    const parsedTransformation = transformations[id]
    if(parsedTransformation == null) {
        throw new Error(`unknown transformation "${id}"`)
    }
    if(parsedTransformation.type === "nounReference") {
        const noun = nouns[parsedTransformation.nounId]
        if(noun == null) {
            throw new Error(`unknown noun "${parsedTransformation.nounId}"`)
        }
        return {
            type: "nounReference",
            nounIdentifier: noun.identifier
        }
    }
    if(!("childrenIds" in parsedTransformation)) {
        return parsedTransformation
    }
    const { childrenIds, ...rest} = parsedTransformation
    return {
        ...rest,
        children: childrenIds.map(id => nestTransformation(id, transformations, nouns))
    } as any
}