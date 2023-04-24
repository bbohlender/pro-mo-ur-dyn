import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import {
    BackSide,
    BoxGeometry,
    BufferGeometry,
    DoubleSide,
    Group,
    InstancedMesh,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    MeshPhongMaterial,
    Quaternion,
    Vector3,
} from "three"
import { getEntityPositionAt, isMotionEntity } from "pro-3d-video/motion"
import { useStore } from "../../state/store.js"

const geometry = new BoxGeometry()
const meshMaterial = new MeshPhongMaterial({ toneMapped: false, color: "white" })

const helperMatrix = new Matrix4()
const translateHelper = new Vector3()
const scaleHelper = new Vector3()
const rotationHelper = new Quaternion()

const MaxAgentCount = 100

export function Agents() {
    const ref = useRef<InstancedMesh>(null)
    useFrame((_, delta) => {
        if (ref.current == null) {
            return
        }

        const { result, duration } = useStore.getState()

        const state = useStore.getState()
        state.duration = duration
        if (state.playing) {
            state.time = duration === 0 ? 0 : (state.time + delta) % duration
        }

        ref.current.count = 0
        for (const value of result) {
            if (!isMotionEntity(value)) {
                continue
            }
            const isPresent = getEntityPositionAt(value.keyframes, state.time, translateHelper)
            if (!isPresent) {
                continue
            }
            translateHelper.y += 0.05
            helperMatrix.compose(translateHelper, rotationHelper.identity(), scaleHelper.setScalar(0.1))
            ref.current.setMatrixAt(ref.current.count, helperMatrix)
            ref.current.count++
            if (ref.current.count === MaxAgentCount) {
                break
            }
        }
        ref.current.instanceMatrix.needsUpdate = true
    })
    return (
        <>
            <instancedMesh frustumCulled={false} args={[geometry, meshMaterial, MaxAgentCount]} ref={ref} />
            <Paths />
        </>
    )
}

const lineMaterial = new LineBasicMaterial({ color: "black" })

export function Paths() {
    const result = useStore((state) => state.result)
    const ref = useRef<Group>(null)
    useEffect(() => {
        if (ref.current == null) {
            return
        }
        const group = ref.current
        for (const value of result) {
            if (!isMotionEntity(value)) {
                continue
            }

            const points: Array<Vector3> = []

            for (let i = 1; i < value.keyframes.length; i++) {
                const p1 = value.keyframes[i - 1]
                const p2 = value.keyframes[i]
                points.push(new Vector3(p1.x, p1.y + 0.05, p1.z), new Vector3(p2.x, p2.y + 0.05, p2.z))
            }

            group.add(new LineSegments(new BufferGeometry().setFromPoints(points), lineMaterial))
        }
        return () => {
            group.clear()
        }
    }, [result])
    return <group ref={ref} />
}
