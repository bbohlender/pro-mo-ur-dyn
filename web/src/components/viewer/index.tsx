import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { MotionEntity, MotionEntityType } from "pro-3d-video/dist/domains/motion/index.js"
import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshPhongMaterial, Quaternion, Vector3 } from "three"

const entities: Array<MotionEntity & { index?: number }> = [
    {
        type: MotionEntityType.Pedestrian,
        keyframes: [
            [0, 0, 0, 0],
            [1, 0, 1, 1],
            [2, 0, 0, 2],
            [0, 0, 0, 3],
        ],
    },
]

const duration = 3
let startTime = performance.now() / 1000

const geometry = new BoxGeometry()
const material = new MeshPhongMaterial()

const helperMatrix = new Matrix4()
const translateHelper = new Vector3()
const scaleHelper = new Vector3()
const rotationHelper = new Quaternion()

export function Viewer() {
    const ref = useRef<InstancedMesh>(null)
    useFrame(() => {
        if (ref.current == null) {
            return
        }
        const currentTime = performance.now() / 1000
        let animationTime = currentTime - startTime
        if (animationTime > duration) {
            animationTime %= duration
            startTime = currentTime - animationTime
            for (const entity of entities) {
                entity.index = 1
            }
        }
        ref.current.count = Math.min(100, entities.length)
        for (let i = 0; i < ref.current.count; i++) {
            const entity = entities[i]
            let index = entity.index ?? 1
            while (index < entity.keyframes.length && entity.keyframes[index][3] < animationTime) {
                index++
            }
            if (index < entity.keyframes.length && entity.keyframes[index - 1][3] <= animationTime) {
                entity.index = index
                const [x1, y1, z1, t1] = entities[i].keyframes[index - 1]
                const [x2, y2, z2, t2] = entities[i].keyframes[index]
                const percent = (animationTime - t1) / (t2 - t1)
                const x = (x2 - x1) * percent + x1
                const y = (y2 - y1) * percent + y1
                const z = (z2 - z1) * percent + z1
                helperMatrix.compose(translateHelper.set(x, y, z), rotationHelper.identity(), scaleHelper.setScalar(1))
            } else {
                helperMatrix.compose(translateHelper, rotationHelper.identity(), scaleHelper.setScalar(0))
            }
            ref.current.setMatrixAt(i, helperMatrix)
        }
        ref.current.instanceMatrix.needsUpdate = true
    })
    return <instancedMesh args={[geometry, material, 1]} ref={ref} />
}
