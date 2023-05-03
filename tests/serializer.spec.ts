import { expect } from "chai"
import { serializeString, flattenAST } from "../src/index.js"
import { parsedAndUnparsedGrammarPairs } from "./test-data.js"

describe("serialize grammar", () => {
    it("should serialize grammars from test-data", () => {
        for (const { parsed, unparsed } of parsedAndUnparsedGrammarPairs) {
            expect(serializeString(flattenAST(parsed))).to.equal(unparsed.replace(/\s*\n\s*/g, " "))
        }
    })

    /* it("should serialize prettified and re-parse description from test-data", () => {
        for (const { parsed } of parsedAndUnparsedGrammarPairs) {
            expect(parse(serializeString(parsed, undefined, multilineStringWhitespace))).to.deep.equal(parsed)
        }
    })*/
})
