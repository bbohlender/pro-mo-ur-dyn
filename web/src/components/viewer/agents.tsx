import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
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
    MeshBasicMaterial,
    MeshPhongMaterial,
    Quaternion,
    Vector3,
} from "three"
import {
    MotionEntity,
    getEntityPositionAt,
    getEntityRotationAt,
    getKeyframeIndex,
    isMotionEntity,
} from "pro-3d-video/motion"
import { useStore } from "../../state/store.js"
import { useModel } from "./use-model.js"
import { useTexture } from "@react-three/drei"

const helperMatrix = new Matrix4()
const translateHelper = new Vector3()
const scaleHelper = new Vector3()
const rotationHelper = new Quaternion()

const MaxAgentCount = 100

export function Agents({ url }: { url: string }) {
    const ref1 = useRef<InstancedMesh>(null)
    const ref2 = useRef<InstancedMesh>(null)
    const { entitiyGeometry, entityMaterial, planeGeometry } = useModel(`${url}.glb`)
    const planeTexture = useTexture(`${url}-bg.png`)
    const planeMaterial = useMemo(
        () => new MeshBasicMaterial({ transparent: true, map: planeTexture, toneMapped: false }),
        [planeTexture]
    )
    useFrame((_, delta) => {
        if (ref1.current == null || ref2.current == null) {
            return
        }

        const {
            result: { agents = [] },
            duration,
        } = useStore.getState()

        const state = useStore.getState()
        state.duration = duration
        if (state.playing) {
            state.time = duration === 0 ? 0 : (state.time + delta) % duration
        }

        ref1.current.count = 0
        ref2.current.count = 0
        for (const value of agents ?? []) {
            const index = getKeyframeIndex(value.keyframes, state.time, 0)
            if (index == null) {
                continue
            }
            getEntityPositionAt(value.keyframes, state.time, index, translateHelper)
            getEntityRotationAt(value.keyframes, state.time, index, rotationHelper)
            translateHelper.y += 0.05
            helperMatrix.compose(translateHelper, rotationHelper, scaleHelper.setScalar(2.5))
            ref1.current.setMatrixAt(ref1.current.count, helperMatrix)
            ref2.current.setMatrixAt(ref1.current.count, helperMatrix)
            ref1.current.count++
            ref2.current.count++
            if (ref1.current.count === MaxAgentCount) {
                break
            }
        }
        ref1.current.instanceMatrix.needsUpdate = true
        ref2.current.instanceMatrix.needsUpdate = true
    })
    return (
        <>
            <instancedMesh frustumCulled={false} args={[entitiyGeometry, entityMaterial, MaxAgentCount]} ref={ref1} />
            <instancedMesh frustumCulled={false} args={[planeGeometry, planeMaterial, MaxAgentCount]} ref={ref2} />
            <Paths />
        </>
    )
}

const lineMaterial = new LineBasicMaterial({ color: "black" })

export function Paths() {
    const agents = (useStore((state) => state.result.agents) as Array<MotionEntity>) ?? []
    const ref = useRef<Group>(null)
    useEffect(() => {
        if (ref.current == null) {
            return
        }
        const group = ref.current
        for (const value of agents) {
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
    }, [agents])
    return <group ref={ref} />
}
