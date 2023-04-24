import { NestedDescriptions } from "../src/index.js"

export const parsedAndUnparsedGrammarPairs: Array<{
    parsed: NestedDescriptions
    unparsed: string
}> = [
    {
        parsed: {
            A: {
                initialVariables: {},
                nouns: {
                    a: {
                        transformation: {
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
                                                                { type: "-()", children: [{ type: "this" }] },
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
                },
                rootNounIdentifier: "a",
            },
        },
        unparsed: `A { a --> -this + 1 * 3 > 2 && false -> 2 | 2 }`,
    },
    {
        parsed: {
            ABC: {
                initialVariables: {},
                nouns: {
                    a: {
                        transformation: {
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
                                                        { type: "null" },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                rootNounIdentifier: "a",
            },
        },
        unparsed: `ABC { a --> this.x = 11 -> this % 2 -> switch 2 { case 0: case 1: if this == 0 then { this } else { this * 2 } case 3: this.x -> null } }`,
    },
    {
        parsed: {
            Test: {
                initialVariables: {
                    var: "123",
                },
                nouns: {
                    a: {
                        transformation: {
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
                },
                rootNounIdentifier: "a",
            },
        },
        unparsed: `Test (var: "123") { a --> { 40%: 1 60%: 2 * 3 } }`,
    },
    {
        parsed: {
            Test: {
                initialVariables: {
                    type: "0",
                    x: 0,
                    y: 0,
                    z: 0,
                    time: 0,
                },
                nouns: {
                    a: {
                        transformation: {
                            type: "operation",
                            identifier: "moveTo",
                            children: [
                                { type: "raw", value: 10 },
                                { type: "raw", value: 0 },
                                { type: "raw", value: 0 },
                                { type: "raw", value: 10 },
                            ],
                        },
                    },
                },
                rootNounIdentifier: "a",
            },
        },
        unparsed: `Test (type: "0" x:0 y:0 z:0  time:0) { a --> moveTo(10,0,0,10) }`,
    },
]
