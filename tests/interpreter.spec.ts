import { expect } from "chai"
import { OperationNextCallback, Value, parse } from "../src/index.js"
import { Operations, interpreteTransformationSynchronous, WorkerInterface } from "../src/index.js"
import { MotionEntity, MotionEntityType, operations } from "../src/domains/motion/index.js"
import { Queue, QueueEntry } from "../src/interpreter/queue.js"

//TODO: write tests for:
//  complex description that returns multiple intermediate results but that does not pause completly
//  complex description that returns multiple intermediate results but that does pause completly
//  complex description that is indefinite, returns intermediate results until requested progress is reached, which is then some time later extended

function testInterpreteSynchronously(text: string, operations: Operations = {}, seed?: number): any {
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
        const result = testInterpreteSynchronously(`Test { a --> 10 
            -> this * 10 
            -> this + 1 }`)
        expect(result).to.equal(101)
    })

    it("should interprete operation execution without including this parameter", async () => {
        const result = testInterpreteSynchronously(`Test { a --> op1(3+3, "Hallo" + " Welt") }`, {
            op1: {
                execute: (next: OperationNextCallback, ...[num, str]: ReadonlyArray<any>) =>
                    next(`${str ?? ""}${num * num}`),
                includeThis: false,
                defaultParameters: [],
            },
        })
        expect(result).to.equal("Hallo Welt36")
    })

    it("should interprete grammars with recursion", async () => {
        const result = testInterpreteSynchronously(`Test { a --> if this == 0 then { 0 } else { this - 1 
            -> a } }`)
        expect(result).to.equal(0)
    })

    it("should interprete complex grammars", async () => {
        const result = testInterpreteSynchronously(`Test { 
            a --> 2 
            -> switch this { case 2: b case 3: c }
            b --> if true then { this * 10 
                -> c } else { c }
            c --> (20 * d)
            d --> this / 2 
            -> this * 2
        }`)
        expect(result).to.equal(400)
    })

    it("should throw an error when using unknown noun", async () => {
        expect(() =>
            testInterpreteSynchronously(`Test { a --> 10 
            -> b }`)
        ).to.throw(`unknown noun "b" from description "Test"`)
    })

    it("should throw an error when using unknown operator", async () => {
        expect(() =>
            testInterpreteSynchronously(`Test { a --> 10 
            -> drive() }`)
        ).to.throw(`unknown operation "drive"`)
    })

    it("should should interprete random based on seed", async () => {
        const results = [4, 8, 3, 50, 50].map((seed) =>
            testInterpreteSynchronously(`Test { a --> { 25%: 1 25%: 2 25%: 3 25%: 4 } }`, undefined, seed)
        )
        expect(results).to.deep.equal([1, 2, 3, 4, 4])
    })
})

describe("test queue", () => {
    const createValue = (e: number): Value => {
        return {
            raw: e,
            index: [],
            variables: {},
        }
    }

    it("should push an entry to the queue ordered descendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e2.value.raw - e1.value.raw
        })
        const entry: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        queue.push(entry)
        expect(queue.list).to.deep.equal([entry])
    })

    it("should push multiple entries to the queue in ordered descendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e2.value.raw - e1.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        const entry3: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        queue.push(entry3)
        expect(queue.list).to.deep.equal([entry2, entry3, entry1])
    })

    it("should push an entry to the front of the queue if it has the highest priority ordered descendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e2.value.raw - e1.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        const entry3: QueueEntry = { value: createValue(5), stack: [{ type: "null" }] }
        queue.push(entry3)
        expect(queue.list).to.deep.equal([entry3, entry2, entry1])
    })

    it("should push an entry to the end of the queue if it has the lowest priority ordered descendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e2.value.raw - e1.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        const entry3: QueueEntry = { value: createValue(0), stack: [{ type: "null" }] }
        queue.push(entry3)
        expect(queue.list).to.deep.equal([entry2, entry1, entry3])
    })

    it("should push an entry to the correct position in a large queue ordered descendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e2.value.raw - e1.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        const entry3: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        const entry4: QueueEntry = { value: createValue(5), stack: [{ type: "null" }] }
        const entry5: QueueEntry = { value: createValue(4), stack: [{ type: "null" }] }
        const entry6: QueueEntry = { value: createValue(0), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        queue.push(entry3)
        queue.push(entry4)
        queue.push(entry5)
        queue.push(entry6)
        expect(queue.list).to.deep.equal([entry4, entry5, entry2, entry3, entry1, entry6])
    })

    it("should push an entry to the beginning of the queue ordered ascendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e1.value.raw - e2.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        const entry3: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        queue.push(entry3)
        queue.push(entry2)
        queue.push(entry1)
        expect(queue.list).to.deep.equal([entry1, entry2, entry3])
    })

    it("should push an entry to the correct position in a small queue ordered ascendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e1.value.raw - e2.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        const entry3: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        queue.push(entry3)
        expect(queue.list).to.deep.equal([entry1, entry3, entry2])
    })

    it("should push an entry to the correct position in a large queue ordered ascendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e1.value.raw - e2.value.raw
        })
        const entry1: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        const entry3: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        const entry4: QueueEntry = { value: createValue(5), stack: [{ type: "null" }] }
        const entry5: QueueEntry = { value: createValue(4), stack: [{ type: "null" }] }
        const entry6: QueueEntry = { value: createValue(0), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        queue.push(entry3)
        queue.push(entry4)
        queue.push(entry5)
        queue.push(entry6)
        expect(queue.list).to.deep.equal([entry6, entry1, entry3, entry2, entry5, entry4])
    })

    it("should push entries with equal values in insertion order ordered ascendingly", () => {
        const queue = new Queue((e1: any, e2: any): number => {
            return e1.value.raw - e2.value.raw
        })
        const entry1: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        const entry2: QueueEntry = { value: createValue(1), stack: [{ type: "null" }] }
        const entry3: QueueEntry = { value: createValue(3), stack: [{ type: "null" }] }
        const entry4: QueueEntry = { value: createValue(2), stack: [{ type: "null" }] }
        queue.push(entry1)
        queue.push(entry2)
        queue.push(entry3)
        queue.push(entry4)
        expect(queue.list).to.deep.equal([entry2, entry1, entry4, entry3])
    })
})

describe("interprete grammar asynchronously", () => {
    it("web worker parallel", async () => {
        const result = await testAsyncInterpreteArithmetic(`Test { a 
            --> ((1 | 2 * 2) 
            -> this * 2) }`)

        expect(result).to.deep.equal([2, 8])
    })

    it("web worker arithmetic async", async () => {
        const result = await testAsyncInterpreteArithmetic(`Test { a 
            --> ((1 | 2 * 2) 
            -> (this + 5 | this * 2)) }`)
        expect(result).to.deep.equal([6, 2, 9, 8])
    })

    it("bela problem", async () => {
        const result = await testAsyncInterpreteMotionEntity(`Test { a --> moveTo(1,1,1,1) }
            Test1 { b --> moveTo(-1,-1,-1,1) }`)
        const entity = {
            type: MotionEntityType.Pedestrian,
            keyframes: [[0, 0, 0, 0] as readonly [number, number, number, number]],
        }
        const moveTo = executeSeveralPositions(entity, [[1, 1, 1, 1]])
        const moveTo2 = executeSeveralPositions(entity, [[-1, -1, -1, 1]])
        expect(result).to.deep.equal([moveTo, moveTo2])
    })
    it("web worker motion entity", async () => {
        const result = await testAsyncInterpreteMotionEntity(
            `Test (type: "car" x:0 y:0 z:0  time:0) { a --> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
                -> moveTo(10,0,0,10) 
            } 
            Test2 (type: "pedestrian" x:0 y:0 z:0  time:0) { a --> moveTo(0,50,0,20) 
                -> moveTo(0,50,0,20) }`
        )
        const entity = {
            type: MotionEntityType.Car,
            keyframes: [[0, 0, 0, 0] as readonly [number, number, number, number]],
        }
        const moveTo = executeSeveralPositions(entity, [
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
            [10, 0, 0, 10],
        ])
        const moveTo2 = executeSeveralPositions({ ...entity, type: MotionEntityType.Pedestrian }, [
            [0, 50, 0, 20],
            [0, 50, 0, 20],
        ])
        expect(result).to.deep.equal([moveTo2, moveTo])
    })
})

function executeSeveralPositions(entity: MotionEntity, positions: Array<[number, number, number, number]>) {
    for (const pos of positions) {
        entity = operations.moveTo.execute((e) => e, JSON.parse(JSON.stringify(entity)), ...pos)
    }
    return entity
}

function testAsyncInterpreteMotionEntity(descriptions: string): Promise<Array<any>> {
    return new Promise((resolve) => {
        const workerInterface = new WorkerInterface(
            new URL("./workerasync.js", import.meta.url),
            {
                name: "testAsyncInterpreteArithmetic",
                type: "module",
            },
            (values, isFinal) => {
                if (isFinal) {
                    workerInterface.terminate()
                    resolve(values.map((v) => v.raw))
                }
            }
        )
        setTimeout(() => {
            workerInterface.updateRequestedProgress(200)
        }, 6000)
        workerInterface.interprete(parse(descriptions), 100)
    })
}

function testAsyncInterpreteArithmetic(descriptions: string): Promise<Array<any>> {
    return new Promise((resolve) => {
        const workerInterface = new WorkerInterface(
            new URL("../dist/domains/arithmetic/worker.js", import.meta.url),
            {
                name: "testAsyncInterpreteArithmetic",
                type: "module",
            },
            (values, isFinal) => {
                if (isFinal) {
                    workerInterface.terminate()
                    resolve(values.map((v) => v.raw))
                }
            }
        )
        workerInterface.interprete(parse(descriptions), 1000)
    })
}
