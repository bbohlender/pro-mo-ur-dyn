import { ParsedTransformation } from "../index.js"

/**
 * further up (low precedence) to further down (high precedence)
 */
const operatorPrecedence: Array<Array<ParsedTransformation["type"]>> = [
    ["parallel"],
    ["sequential"],
    ["||"],
    ["&&"],
    ["!"],
    ["==", "!="],
    ["<", "<=", ">", ">="],
    ["+", "-"],
    ["*", "/", "%"],
    ["-()"],
    [
        "getVariable",
        "setVariable",
        "if",
        "switch",
        "stochasticSwitch",
        "nounReference",
        "operation",
        "this",
        "raw",
        "return",
        "null",
    ],
]

const bracketFree: Array<ParsedTransformation["type"]> = ["if", "switch", "stochasticSwitch", "operation"]

const operatorPrecedenceMap: { [Key in ParsedTransformation["type"]]: number } = operatorPrecedence.reduce(
    (result, types, i) => {
        types.forEach((type) => (result[type] = i))
        return result
    },
    {} as any
)

export function hasHigherPrecendence(s1: ParsedTransformation, s2: ParsedTransformation): boolean {
    const s1Precedence = operatorPrecedenceMap[s1.type]
    const s2Precedence = operatorPrecedenceMap[s2.type]
    return s1Precedence > s2Precedence
}

export function requiresBracket(parent: ParsedTransformation, child: ParsedTransformation): boolean {
    return !bracketFree.includes(parent.type) && hasHigherPrecendence(parent, child)
}
