import { generateUUID } from "three/src/math/MathUtils.js"
import {
    ParsedDescriptions,
    NestedDescriptions,
    NestedTransformation,
    NestedDescription,
    NestedNounReference,
} from "./index.js"

export function flattenAST(nestedDescriptions: NestedDescriptions): ParsedDescriptions {
    const transformations: ParsedDescriptions["transformations"] = {}
    const nouns: ParsedDescriptions["nouns"] = {}
    const nounIdentifierIdMap = new Map<string, string>()
    const descriptions = Object.entries(nestedDescriptions).reduce<ParsedDescriptions["descriptions"]>(
        (prev, [identifier, { initialVariables, nouns: nestedNouns, rootNounIdentifier }]) => {
            for (const [nounIdentifier, transformation] of Object.entries(nestedNouns)) {
                nouns[getNounId(nounIdentifier, nounIdentifierIdMap)] = {
                    identifier: nounIdentifier,
                    tansformationId: flattenTransformation(transformation, transformations, nounIdentifierIdMap),
                }
            }
            prev[identifier] = {
                initialVariables,
                identifier,
                rootNounId: getNounId(rootNounIdentifier, nounIdentifierIdMap),
            }
            return prev
        },
        {}
    )
    return {
        nouns,
        descriptions,
        transformations,
    }
}

function getNounId(identifier: string, nounIdentifierIdMap: Map<string, string>): string {
    const id = nounIdentifierIdMap.get(identifier)
    if (id != null) {
        return id
    }
    const newId = generateUUID()
    nounIdentifierIdMap.set(identifier, newId)
    return newId
}

function flattenTransformation(
    nestedTransformation: NestedTransformation,
    transformations: ParsedDescriptions["transformations"],
    nounIdentifierIdMap: Map<string, string>
): string {
    const transformationId = generateUUID()
    if (nestedTransformation.type === "nounReference") {
        transformations[transformationId] = {
            type: "nounReference",
            nounId: getNounId(nestedTransformation.nounIdentifier, nounIdentifierIdMap),
        }
        return transformationId
    }
    if ("children" in nestedTransformation && Array.isArray(nestedTransformation.children)) {
        const { children, ...rest } = nestedTransformation
        transformations[transformationId] = {
            childrenIds: children.map((child) => flattenTransformation(child, transformations, nounIdentifierIdMap)),
            ...rest,
        } as any
    } else {
        transformations[transformationId] = nestedTransformation as any
    }
    return transformationId
}

export function nestAST(
    { descriptions, nouns: parsedNouns, transformations }: ParsedDescriptions,
    addId: boolean
): NestedDescriptions {
    return Object.values(descriptions).reduce<NestedDescriptions>(
        (prev, { initialVariables, identifier, rootNounId }) => {
            const nouns: NestedDescription["nouns"] = {}
            for (const { tansformationId, identifier: nounIdentifier } of Object.values(parsedNouns)) {
                nouns[nounIdentifier] = nestTransformation(
                    tansformationId,
                    transformations,
                    parsedNouns,
                    descriptions,
                    identifier,
                    addId
                )
            }
            const rootNoun = parsedNouns[rootNounId]
            if (rootNoun == null) {
                throw new Error(`unknown noun "${rootNounId}"`)
            }
            prev[identifier] = {
                initialVariables,
                nouns,
                rootNounIdentifier: rootNoun.identifier,
            }
            return prev
        },
        {}
    )
}

export function nestTransformation(
    id: string,
    transformations: ParsedDescriptions["transformations"],
    nouns: ParsedDescriptions["nouns"],
    descriptions: ParsedDescriptions["descriptions"],
    currentDescriptionIdentifier: string,
    addId: boolean
): NestedTransformation {
    const parsedTransformation = transformations[id]
    if (parsedTransformation == null) {
        throw new Error(`unknown transformation "${id}"`)
    }
    let transformation: NestedTransformation
    if (parsedTransformation.type === "nounReference") {
        const noun = nouns[parsedTransformation.nounId]
        if (noun == null) {
            throw new Error(`unknown noun "${parsedTransformation.nounId}"`)
        }
        let descriptionIdentifier: string = currentDescriptionIdentifier
        if (parsedTransformation.descriptionId != null) {
            const description = descriptions[parsedTransformation.descriptionId]
            if (description == null) {
                throw new Error(`unknown description "${parsedTransformation.descriptionId}"`)
            }
            descriptionIdentifier = description.identifier
        }
        transformation = {
            type: "nounReference",
            nounIdentifier: noun.identifier,
            descriptionIdentifier,
        }
    } else if (!("childrenIds" in parsedTransformation)) {
        transformation = parsedTransformation
    } else {
        const { childrenIds, ...rest } = parsedTransformation
        transformation = {
            ...rest,
            children: childrenIds.map((id) =>
                nestTransformation(id, transformations, nouns, descriptions, currentDescriptionIdentifier, addId)
            ),
        } as any
    }
    if (addId) {
        transformation.id = id
    }
    return transformation
}
