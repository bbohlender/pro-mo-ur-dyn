import {
    Box2,
    Box3,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    EdgesGeometry,
    Event,
    InterleavedBufferAttribute,
    Line,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Path,
    Points,
    PointsMaterial,
    Quaternion,
    Shape,
    ShapeGeometry,
    ShapeUtils,
    Vector2,
    Vector3,
} from "three"
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { makeScaleMatrix, computeDirectionMatrix, makeRotationMatrix, makeTranslationMatrix } from "./math.js"
import { sampleGeometry, distributeOverSizes } from "../sample.js"
import { filterNull } from "../../util.js"

const helperMatrix = new Matrix4()
const helperVector = new Vector3()
const helperQuaternion = new Quaternion()

function setupObject3D(object: Object3D, matrix: Matrix4): Object3D {
    object.matrixAutoUpdate = false
    object.matrix = matrix
    object.updateMatrixWorld(true)
    return object
}

export enum ObjectType {
    Point,
    Line,
    Mesh,
}

export abstract class Primitive {
    public abstract readonly matrix: Matrix4

    private geometryCache: BufferGeometry | null = null
    private objectCache: Object3D | null = null
    private outlineCache: Object3D | null = null

    getGeometry(): BufferGeometry {
        if (this.geometryCache === null) {
            this.geometryCache = this.computeGeometry()
        }
        return this.geometryCache
    }

    getOutline(): Object3D {
        if (this.outlineCache == null) {
            this.outlineCache = this.computeOutline()
        }
        return this.outlineCache
    }

    getObject(): Object3D {
        if (this.objectCache == null) {
            this.objectCache = this.computeObject3D()
        }
        return this.objectCache
    }

    dispose(): void {
        this.geometryCache?.dispose()
    }

    //abstract applyMatrixToGeometry(matrix: Matrix4): void;

    multiplyMatrix(matrix: Matrix4): void {
        this.matrix.multiply(matrix)
    }

    premultiplyMatrix(matrix: Matrix4): void {
        this.matrix.premultiply(matrix)
    }

    abstract getSize(dimension: number): number
    abstract extrude(by: number): Primitive
    abstract samplePoints(amount: number): Array<Primitive>
    abstract components(type: "points" | "lines" | "faces"): Array<Primitive>
    abstract clone(): Primitive
    protected abstract computeObject3D(): Object3D
    abstract getBoundingBox(target: Box3): void
    abstract getVertecies(): Array<Vector3>
    protected abstract computeGeometry(): BufferGeometry
    protected abstract computeOutline(): Object3D
}

export class PointPrimitive extends Primitive {
    multiplyMatrix(matrix: Matrix4): Primitive {
        return new PointPrimitive(this.matrix.clone().multiply(matrix))
    }

    constructor(public readonly matrix: Matrix4) {
        super()
    }

    getBoundingBox(target: Box3): void {
        target.min.set(0, 0, 0)
        target.max.set(0, 0, 0)
    }

    getVertecies(): Vector3[] {
        return [new Vector3()]
    }

    extrude(by: number): Primitive {
        throw new Error("method not implemented")
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        if (type === "points") {
            return [this.clone()]
        } else {
            return []
        }
    }
    computeObject3D(): Object3D {
        return setupObject3D(new Points(new BufferGeometry().setFromPoints([new Vector3()])), this.matrix)
    }

    protected computeOutline(): Object3D<Event> {
        const point = new Points(
            new BufferGeometry().setFromPoints([new Vector3()]),
            new PointsMaterial({
                color: 0,
                size: 3e-8,
                transparent: true,
                depthTest: false,
            })
        )
        point.renderOrder = 1000
        return setupObject3D(point, this.matrix)
    }

    clone(): Primitive {
        return new PointPrimitive(this.matrix.clone())
    }

    protected computeGeometry(): BufferGeometry {
        return new BufferGeometry().setFromPoints([new Vector3().setFromMatrixPosition(this.matrix)])
    }

    getSize(dimension: number): number {
        if (dimension === 0) {
            return 1
        }
        return 0
    }

    samplePoints(amount: number): Primitive[] {
        return new Array(amount).fill(null).map(() => this.clone())
    }
}

const boxHelper = new Box2()

const YAXIS = new Vector3(0, 1, 0)
const ZAXIS = new Vector3(0, 0, 1)

const invertMatrix = new Matrix4()

/**
 * face in x, z axis
 */
export class FacePrimitive extends Primitive {
    clone(): Primitive {
        return new FacePrimitive(this.matrix.clone(), this.shape.clone())
    }
    getVertecies(): Vector3[] {
        return this.shape.getPoints().map(({ x, y }) => new Vector3(x, 0, y))
    }

    constructor(public readonly matrix: Matrix4, private readonly shape: Shape) {
        super()
    }

    static fromLengthAndHeight(matrix: Matrix4, x: number, z: number, direction: Vector3): FacePrimitive {
        const points = [new Vector2(x, 0), new Vector2(x, z), new Vector2(0, z), new Vector2(0, 0)]
        const shape = new Shape(points)
        helperQuaternion.setFromUnitVectors(ZAXIS, direction)
        helperMatrix.makeRotationFromQuaternion(helperQuaternion)
        matrix.multiply(helperMatrix)
        return new FacePrimitive(matrix, shape)
    }

    getBoundingBox(target: Box3): void {
        boxHelper.setFromPoints(this.shape.getPoints())
        target.min.set(boxHelper.min.x, 0, boxHelper.min.y)
        target.max.set(boxHelper.max.x, 0, boxHelper.max.y)
    }

    protected computeGeometry(): BufferGeometry {
        const geometry = new ShapeGeometry(this.shape)
        invertWinding(geometry)
        swapYZ(geometry)
        const resultGeometry = new BufferGeometry()
        resultGeometry.attributes = geometry.attributes
        resultGeometry.index = geometry.index
        return resultGeometry
    }

    invert(): FacePrimitive {
        const newMatrix = this.matrix.clone()
        newMatrix.multiply(makeRotationMatrix(Math.PI, 0, 0))
        const points = this.shape.getPoints(5)
        const holes = this.shape.holes
        const newShape = new Shape(points.map(({ x, y }) => new Vector2(x, -y)))
        newShape.holes = holes.map((hole) => new Path(hole.getPoints().map(({ x, y }) => new Vector2(x, -y))))
        return new FacePrimitive(newMatrix, newShape)
    }

    extrude(by: number): Primitive {
        const matrix = this.matrix.clone()
        this.matrix.identity()
        this.multiplyMatrix(makeTranslationMatrix(0, by, 0))
        const points = this.shape.getPoints(5)
        return new CombinedPrimitive(matrix, [
            ...points.map((p1, i) => {
                const p2 = points[(i + 1) % points.length]
                helperVector.set(p2.x - p1.x, 0, p2.y - p1.y)
                const length = helperVector.length()
                const matrix = makeTranslationMatrix(p1.x, 0, p1.y, new Matrix4())
                matrix.multiply(computeDirectionMatrix(helperVector.normalize(), YAXIS))
                const result = FacePrimitive.fromLengthAndHeight(matrix, length, by, YAXIS)
                if (by < 0) {
                    return result.invert()
                }
                return result
            }),
            this.clone(),
        ])
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        switch (type) {
            case "points":
                return this.shape
                    .extractPoints(5)
                    .shape.map(
                        (point) =>
                            new PointPrimitive(this.matrix.clone().multiply(makeTranslationMatrix(point.x, 0, point.y)))
                    )
            case "faces":
                return [this]
            default:
                throw new Error("not implemented")
        }
    }

    computeObject3D(): Object3D {
        return setupObject3D(new Mesh(this.getGeometry()), this.matrix)
    }

    protected computeOutline(): Object3D<Event> {
        const outerPath = this.pathToOutline(this.shape.extractPoints(5).shape)
        const innerPaths = this.shape.holes.map((path) => this.pathToOutline(path.getPoints(5)))
        const result = setupObject3D(new Object3D(), this.matrix)
        result.renderOrder = 1000
        result.add(outerPath, ...innerPaths)
        return result
    }

    private pathToOutline(path: Array<Vector2>): Object3D {
        if (path.length === 0) {
            return new Object3D()
        }
        path.push(path[0])
        const geometry = new BufferGeometry().setFromPoints(path)
        swapYZ(geometry)
        return new Line(
            geometry,
            new MeshBasicMaterial({
                color: 0,
                transparent: true,
            })
        )
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error(`not implemented`)
    }

    getSize(dimension: number): number {
        if (dimension === 2) {
            const contourArea = ShapeUtils.area(this.shape.getPoints(5))
            return this.shape.holes.reduce((prev, hole) => prev - ShapeUtils.area(hole.getPoints(5)), contourArea)
        }
        return 0
    }

    samplePoints(amount: number): Primitive[] {
        const geometry = this.getGeometry()
        if (geometry == null) {
            return []
        }
        return sampleGeometry(geometry, amount).map(
            (position) =>
                new PointPrimitive(
                    this.matrix.clone().multiply(makeTranslationMatrix(position.x, position.y, position.z))
                )
        )
    }
}

function swapYZ(geometry: BufferGeometry): void {
    let temp: number
    const positionAttribute = geometry.getAttribute("position") as BufferAttribute | InterleavedBufferAttribute
    for (let i = 0; i < positionAttribute.count; i++) {
        // swap the first and third values
        temp = positionAttribute.getY(i)
        positionAttribute.setY(i, positionAttribute.getZ(i))
        positionAttribute.setZ(i, temp)
    }
}

function invertWinding(geometry: BufferGeometry): void {
    let temp: number
    for (let i = 0; i < geometry.index!.count; i += 3) {
        // swap the first and third values
        temp = geometry.index!.getX(i)
        geometry.index!.setX(i, geometry.index!.getX(i + 2))
        geometry.index!.setX(i + 2, temp)
    }
}

const box3Helper = new Box3()

const boxGeometry = new BoxGeometry(1, 1, 1)
const outlineGeometry = new EdgesGeometry(boxGeometry)

export class ObjectPrimitive extends Primitive {
    clone(): Primitive {
        return new ObjectPrimitive(this.matrix.clone(), this.object.clone())
    }
    getVertecies(): Vector3[] {
        throw new Error("Method not implemented.")
    }

    constructor(public readonly matrix: Matrix4, private readonly object: Object3D) {
        super()
        this.computeObject3D()
    }

    extrude(by: number): Primitive {
        throw new Error("Method not implemented.")
    }
    components(type: "points" | "lines" | "faces"): Primitive[] {
        throw new Error("Method not implemented.")
    }
    computeObject3D(): Object3D {
        const wrapper = new Object3D()
        wrapper.add(this.object)
        return setupObject3D(wrapper, this.matrix)
    }

    computeGeometry(): BufferGeometry {
        throw new Error("method not implemented")
    }

    getBoundingBox(target: Box3): void {
        getLocalBoundingBox(this.object, target)
    }

    protected computeOutline(): Object3D<Event> {
        this.getBoundingBox(box3Helper)
        box3Helper.getCenter(helperVector)
        const lines = new LineSegments(
            outlineGeometry,
            new LineBasicMaterial({
                color: 0,
            })
        )
        lines.matrix.copy(this.matrix).multiply(makeTranslationMatrix(helperVector.x, helperVector.y, helperVector.z))
        box3Helper.getSize(helperVector)
        lines.matrix.multiply(makeScaleMatrix(helperVector.x, helperVector.y, helperVector.z))
        lines.renderOrder = 1000
        return lines
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error("Method not implemented.")
    }

    getSize(dimension: number): number {
        throw new Error("Method not implemented.")
    }

    samplePoints(amount: number): Primitive[] {
        throw new Error("Method not implemented.")
    }
}

function getLocalBoundingBox(object: Object3D, target?: Box3): Box3 {
    target = target ?? new Box3()
    if (object instanceof Mesh) {
        ;(object.geometry as BufferGeometry).computeBoundingBox()
        target.copy((object.geometry as BufferGeometry).boundingBox!)
    } else {
        target.makeEmpty()
    }
    for (const child of object.children) {
        if (child.children.length === 0 && !(child instanceof Mesh)) {
            continue
        }
        const box = getLocalBoundingBox(child).applyMatrix4(child.matrix)
        target.union(box)
    }
    return target
}

export class GeometryPrimitive extends Primitive {
    clone(): Primitive {
        return new GeometryPrimitive(this.matrix.clone(), this.geometry.clone())
    }
    constructor(public readonly matrix: Matrix4, private readonly geometry: BufferGeometry) {
        super()
        geometry.computeBoundingBox()
    }

    extrude(by: number): Primitive {
        throw new Error("Method not implemented.")
    }
    components(type: "points" | "lines" | "faces"): Primitive[] {
        throw new Error("Method not implemented.")
    }
    computeObject3D(): Object3D {
        return setupObject3D(new Mesh(this.getGeometry()), this.matrix)
    }

    getVertecies(): Vector3[] {
        throw new Error("Method not implemented.")
    }

    getBoundingBox(target: Box3): void {
        target.copy(this.geometry.boundingBox!)
    }

    computeGeometry(): BufferGeometry {
        return this.geometry
    }
    protected computeOutline(): Object3D<Event> {
        const lines = new LineSegments(
            new EdgesGeometry(this.geometry),
            new LineBasicMaterial({
                color: 0,
            })
        )
        setupObject3D(lines, this.matrix)
        lines.renderOrder = 1000
        return lines
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error("Method not implemented.")
    }
    getSize(dimension: number): number {
        throw new Error("Method not implemented.")
    }
    samplePoints(amount: number): Primitive[] {
        const geometry = this.getGeometry()
        if (geometry == null) {
            return []
        }
        return sampleGeometry(geometry, amount).map(
            (position) =>
                new PointPrimitive(
                    this.matrix.clone().multiply(makeTranslationMatrix(position.x, position.y, position.z))
                )
        )
    }
}

export class CombinedPrimitive extends Primitive {
    clone(): Primitive {
        return new CombinedPrimitive(
            this.matrix.clone(),
            this.primitives.map((primitive) => primitive.clone())
        )
    }

    constructor(public readonly matrix: Matrix4, private readonly primitives: Array<Primitive>) {
        super()
    }

    getVertecies(): Vector3[] {
        return this.primitives.reduce<Array<Vector3>>(
            (prev, primitive) =>
                prev.concat(primitive.getVertecies().map((vertex) => vertex.applyMatrix4(primitive.matrix))),
            []
        )
    }

    extrude(by: number): Primitive {
        return new CombinedPrimitive(
            this.matrix,
            this.primitives.map((primitive) => primitive.extrude(by))
        )
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        const results = this.primitives.map((primitive) => primitive.components(type)).reduce((v1, v2) => v1.concat(v2))
        for (const result of results) {
            result.premultiplyMatrix(this.matrix)
        }
        return results
    }

    computeObject3D(): Object3D {
        const object = setupObject3D(new Object3D(), this.matrix)
        this.primitives.forEach((primitive) => object.add(primitive.getObject()))
        return object
    }

    getBoundingBox(target: Box3): void {
        target.makeEmpty()
        this.primitives.forEach((primitive) => {
            primitive.getBoundingBox(box3Helper)
            box3Helper.applyMatrix4(primitive.matrix)
            target.union(box3Helper)
        })
    }

    protected computeGeometry(): BufferGeometry {
        const disposableBuffers = this.primitives
            .map((primitive) => primitive.getGeometry().clone().applyMatrix4(primitive.matrix))
            .filter(filterNull)
        const result = mergeBufferGeometries(disposableBuffers)
        disposableBuffers.forEach((buffer) => buffer.dispose())
        return result
    }

    protected computeOutline(): Object3D {
        const object = setupObject3D(new Object3D(), this.matrix)
        this.primitives.forEach((primitive) => object.add(primitive.getOutline()))
        object.renderOrder = 1000
        return object
    }
    getSize(dimension: number): number {
        return this.primitives.reduce((prev, primitive) => primitive.getSize(dimension) + prev, 0)
    }

    samplePoints(amount: number): Primitive[] {
        const sizes = this.primitives.map((primitive) => primitive.getSize(2))
        const amounts = distributeOverSizes(sizes, amount)
        const result: Array<Primitive> = []
        for (let index = 0; index < amounts.length; index++) {
            const amountAtIndex = amounts[index]
            if (amountAtIndex == null) {
                continue
            }
            result.push(...this.primitives[index].samplePoints(amountAtIndex))
        }
        return result
    }
}

/*export class EmptyPrimitive extends Primitive {
    constructor(public matrix: Matrix4, public readonly size: Vector3) {
        super()
    }

    extrude(by: number): Primitive {
        const resultSize = this.size.clone()
        resultSize.y += by
        return new EmptyPrimitive(this.matrix.clone(), resultSize)
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        return []
    }
    toObject3D(): Object3D<Event> {
        return setupObject3D(new Object3D(), this.matrix)
    }

    computeGeometry(): BufferGeometry | undefined {
        return undefined
    }
}*/
