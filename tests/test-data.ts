import { NestedDescriptions, ParsedDescriptions } from "../src/index.js"

export const parsedAndUnparsedGrammarPairs: Array<{
    parsed: NestedDescriptions
    unparsed: string
}> = [
    {
        parsed: [
            {
                identifier: "A",
                initialVariables: {},
                nouns: {
                    a: {
                        type: "parallel",
                        children: [
                            {
                                type: "sequential",
                                children: [
                                    {
                                        type: "&&",
                                        children: [
                                            {
                                                type: ">",
                                                children: [
                                                    {
                                                        type: "+",
                                                        children: [
                                                            { type: "-", children: [{ type: "this" }] },
                                                            {
                                                                type: "*",
                                                                children: [
                                                                    { type: "raw", value: 1 },
                                                                    { type: "raw", value: 3 },
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                    { type: "raw", value: 2 },
                                                ],
                                            },
                                            { type: "raw", value: false },
                                        ],
                                    },
                                    { type: "raw", value: 2 },
                                ],
                            },
                            { type: "raw", value: 2 },
                        ],
                    },
                },
                rootNounIdentifier: "a",
            },
        ],
        unparsed: `A { a --> -this + 1 * 3 > 2 && false -> 2 | 2 }`,
    },
    {
        parsed: [
            {
                identifier: "ABC",
                initialVariables: {},
                nouns: {
                    a: {
                        type: "setVariable",
                        identifier: "x",
                        children: [
                            {
                                type: "sequential",
                                children: [
                                    { type: "raw", value: 11 },
                                    { type: "%", children: [{ type: "this" }, { type: "raw", value: 2 }] },
                                    {
                                        type: "switch",
                                        cases: [[0, 1], [3]],
                                        children: [
                                            { type: "raw", value: 2 },
                                            {
                                                type: "if",
                                                children: [
                                                    {
                                                        type: "==",
                                                        children: [{ type: "this" }, { type: "raw", value: 0 }],
                                                    },
                                                    { type: "this" },
                                                    {
                                                        type: "*",
                                                        children: [{ type: "this" }, { type: "raw", value: 2 }],
                                                    },
                                                ],
                                            },
                                            {
                                                type: "sequential",
                                                children: [
                                                    { type: "getVariable", identifier: "x" },
                                                    { type: "return" },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
                rootNounIdentifier: "a",
            },
        ],
        unparsed: `ABC { a --> this.x = 11 -> this % 2 -> switch 2 { case 0: case 1: if this == 0 then { this } else { this * 2 } case 3: this.x -> return } }`,
    },
    {
        parsed: [
            {
                identifier: "Test",
                initialVariables: {
                    var: "123",
                },
                nouns: {
                    a: {
                        type: "stochasticSwitch",
                        probabilities: [0.4, 0.6],
                        children: [
                            { type: "raw", value: 1 },
                            {
                                type: "*",
                                children: [
                                    { type: "raw", value: 2 },
                                    { type: "raw", value: 3 },
                                ],
                            },
                        ],
                    },
                },
                rootNounIdentifier: "a",
            },
        ],
        unparsed: `Test (var: "123") { a --> { 40%: 1 60%: 2 * 3 } }`,
    },
]
