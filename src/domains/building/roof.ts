import { Box3, BufferGeometry, ExtrudeGeometry, Shape, Vector2, Vector3 } from "three"
import { makeRotationMatrix } from "./math.js"
import { GeometryPrimitive, Primitive } from "./primitive.js"
import { OperationNextCallback } from "../../index.js"

class PrismGeometry extends ExtrudeGeometry {
    constructor(width: number, height: number, depth: number) {
        super(new Shape([new Vector2(0, 0), new Vector2(width / 2, height), new Vector2(width, 0)]), {
            depth,
            bevelEnabled: false,
        })
    }
}

const box3Helper = new Box3()
const vectorHelper = new Vector3()

export function computeGableRoof(
    next: OperationNextCallback,
    astId: string,
    seed: string,
    instance: Primitive,
    rotation?: number,
    width?: number,
    height?: number,
    depth?: number
): any {
    const yRotation = rotation == null ? 0 : (Math.PI * rotation) / 180
    const matrix = makeRotationMatrix(0, -yRotation, 0)
    box3Helper.setFromPoints(instance.getVertecies().map((vertex) => vertex.applyMatrix4(matrix)))
    box3Helper.getSize(vectorHelper)
    const geometry = new PrismGeometry(width ?? vectorHelper.x, height ?? vectorHelper.y, depth ?? vectorHelper.z)
    geometry.translate(box3Helper.min.x, box3Helper.min.y, box3Helper.min.z)
    geometry.computeBoundingBox()
    geometry.rotateY(yRotation)
    const resultGeometry = new BufferGeometry()
    resultGeometry.attributes = geometry.attributes
    resultGeometry.index = geometry.index
    return next(new GeometryPrimitive(instance.matrix, resultGeometry))
}
