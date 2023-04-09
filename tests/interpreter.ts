import { expect } from "chai"
import { parse } from "../src/index.js"
import { interpreteTransformationSynchronous } from "../src/interpreter/interpreter.js"
import { Operations } from "../src/interpreter/index.js"

function testInterpreteSynchronously(text: string, operations: Operations<any> = {}, seed?: number): any {
    const descriptions = parse(text)
    const [description] = Object.values(descriptions)
    const rootTransformation = description.nouns[description.rootNounIdentifier]
    const { raw } = interpreteTransformationSynchronous(
        { raw: 1, index: [], variables: {} },
        rootTransformation,
        descriptions,
        {
            cloneValue: (v) => v,
            comparePriority: () => 0,
            computeDurationMS: 0,
            createValue: () => 0,
            getComputeProgress: () => 0,
            operations,
            shouldInterrrupt: () => false,
            shouldWait: () => false,
            seed,
        }
    )
    return raw
}

describe("interprete grammar synchronously", () => {
    it("should interprete sequential execution", async () => {
        const result = testInterpreteSynchronously(`Test { a --> 10 -> this * 10 -> this + 1 }`)
        expect(result).to.equal(101)
    })

    it("should interprete operation execution without including this parameter", async () => {
        const result = testInterpreteSynchronously(`Test { a --> op1(3+3, "Hallo" + " Welt") }`, {
            op1: {
                execute: (...[num, str]: ReadonlyArray<any>) => `${str ?? ""}${num * num}`,
                includeThis: false,
                defaultParameters: [],
            },
        })
        expect(result).to.equal("Hallo Welt36")
    })

    it("should interprete grammars with recursion", async () => {
        const result = testInterpreteSynchronously(`Test { a --> if this == 0 then { 0 } else { this - 1 -> a } }`)
        expect(result).to.equal(0)
    })

    it("should interprete complex grammars", async () => {
        const result = testInterpreteSynchronously(`Test { 
            a --> 2 -> switch this { case 2: b case 3: c }
            b --> if true then { this * 10 -> c } else { c }
            c --> (20 * d)
            d --> this / 2 -> this * 2
        }`)
        expect(result).to.equal(400)
    })

    it("should throw an error when using unknown noun", async () => {
        expect(() => testInterpreteSynchronously(`Test { a --> 10 -> b }`)).to.throw(
            `unknown noun "b" from description "Test"`
        )
    })

    it("should throw an error when using unknown operator", async () => {
        expect(() => testInterpreteSynchronously(`Test { a --> 10 -> drive() }`)).to.throw(`unknown operation "drive"`)
    })

    it("should should interprete random based on seed", async () => {
        const results = [4, 8, 3, 50, 50].map((seed) =>
            testInterpreteSynchronously(`Test { a --> { 25%: 1 25%: 2 25%: 3 25%: 4 } }`, undefined, seed)
        )
        expect(results).to.deep.equal([1, 2, 3, 4, 4])
    })
})
