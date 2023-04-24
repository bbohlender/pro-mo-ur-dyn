import { generateUUID } from "three/src/math/MathUtils.js"
import { ParsedDescriptions, NestedDescriptions, NestedTransformation, NestedDescription, NestedNoun } from "./index.js"

export function flattenAST(nestedDescriptions: NestedDescriptions): ParsedDescriptions {
    const transformations: ParsedDescriptions["transformations"] = {}
    const nouns: ParsedDescriptions["nouns"] = {}
    const nounIdentifierIdMap = new Map<string, string>()
    const descriptionIdentifierIdMap = new Map<string, string>()
    const descriptions = Object.entries(nestedDescriptions).reduce<ParsedDescriptions["descriptions"]>(
        (prev, [identifier, { initialVariables, nouns: nestedNouns, rootNounIdentifier }]) => {
            const descriptionId = getDescriptionId(identifier, descriptionIdentifierIdMap, nestedDescriptions)
            for (const [nounIdentifier, noun] of Object.entries(nestedNouns)) {
                nouns[getNounId(nounIdentifier, identifier, nounIdentifierIdMap, nestedNouns)] = {
                    identifier: nounIdentifier,
                    tansformationId: flattenTransformation(
                        noun.transformation,
                        transformations,
                        nounIdentifierIdMap,
                        descriptionIdentifierIdMap,
                        nestedDescriptions
                    ),
                    descriptionId,
                }
            }
            prev[descriptionId] = {
                initialVariables,
                identifier,
                rootNounId: getNounId(rootNounIdentifier, identifier, nounIdentifierIdMap, nestedNouns),
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

function getNounId(
    identifier: string,
    descriptionIdentifier: string,
    nounIdentifierIdMap: Map<string, string>,
    nouns: NestedDescription["nouns"]
): string {
    const noun = nouns[identifier]
    if (noun == null) {
        throw new Error(`unknown noun "${identifier}" at "${descriptionIdentifier}"`)
    }
    const astId = noun.astId
    if (astId != null) {
        return astId
    }
    const globalIdentifier = `${descriptionIdentifier}/${identifier}`
    const id = nounIdentifierIdMap.get(globalIdentifier)
    if (id != null) {
        return id
    }
    const newId = `n${generateUUID()}`
    nounIdentifierIdMap.set(globalIdentifier, newId)
    return newId
}

function getDescriptionId(
    identifier: string,
    descriptionIdentifierIdMap: Map<string, string>,
    descriptions: NestedDescriptions
): string {
    const description = descriptions[identifier]
    if (description == null) {
        throw new Error(`unknown description "${identifier}"`)
    }
    const astId = description.astId
    if (astId != null) {
        return astId
    }
    const id = descriptionIdentifierIdMap.get(identifier)
    if (id != null) {
        return id
    }
    const newId = `d${generateUUID()}`
    descriptionIdentifierIdMap.set(identifier, newId)
    return newId
}

function flattenTransformation(
    nestedTransformation: NestedTransformation,
    transformations: ParsedDescriptions["transformations"],
    nounIdentifierIdMap: Map<string, string>,
    descriptionIdentifierIdMap: Map<string, string>,
    nestedDescriptions: NestedDescriptions
): string {
    const transformationId = nestedTransformation.astId ?? `t${generateUUID()}`
    if (nestedTransformation.type === "nounReference") {
        transformations[transformationId] = {
            type: "nounReference",
            nounId: getNounId(
                nestedTransformation.nounIdentifier,
                nestedTransformation.descriptionIdentifier,
                nounIdentifierIdMap,
                nestedDescriptions[nestedTransformation.descriptionIdentifier].nouns
            ),
            descriptionId: getDescriptionId(
                nestedTransformation.descriptionIdentifier,
                descriptionIdentifierIdMap,
                nestedDescriptions
            ),
        }
        return transformationId
    }
    if ("children" in nestedTransformation && Array.isArray(nestedTransformation.children)) {
        const { children, ...rest } = nestedTransformation
        transformations[transformationId] = {
            childrenIds: children.map((child) =>
                flattenTransformation(child, transformations, nounIdentifierIdMap, descriptionIdentifierIdMap, nestedDescriptions)
            ),
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
    return Object.entries(descriptions).reduce<NestedDescriptions>(
        (prev, [id, { initialVariables, identifier, rootNounId }]) => {
            const nouns: NestedDescription["nouns"] = {}
            for (const [astId, { descriptionId, tansformationId, identifier: nounIdentifier }] of Object.entries(
                parsedNouns
            )) {
                if (descriptionId != id) {
                    continue
                }
                nouns[nounIdentifier] = {
                    transformation: nestTransformation(
                        tansformationId,
                        transformations,
                        parsedNouns,
                        descriptions,
                        identifier,
                        addId
                    ),
                }
                if (addId) {
                    nouns[nounIdentifier].astId = astId
                }
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
    astId: string,
    transformations: ParsedDescriptions["transformations"],
    nouns: ParsedDescriptions["nouns"],
    descriptions: ParsedDescriptions["descriptions"],
    currentDescriptionIdentifier: string,
    addId: boolean
): NestedTransformation {
    let transformation: NestedTransformation
    const parsedTransformation = transformations[astId]
    if (parsedTransformation == null) {
        throw new Error(`unknown transformation "${astId}"`)
    }
    if (parsedTransformation.type === "nounReference") {
        const noun = nouns[parsedTransformation.nounId]
        if (noun == null) {
            throw new Error(`unknown noun "${parsedTransformation.nounId}"`)
        }
        const description = descriptions[parsedTransformation.descriptionId]
        if (description == null) {
            throw new Error(`unknown description "${parsedTransformation.descriptionId}"`)
        }
        transformation = {
            type: "nounReference",
            nounIdentifier: noun.identifier,
            descriptionIdentifier: description.identifier,
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
        transformation.astId = astId
    }
    return transformation
}
