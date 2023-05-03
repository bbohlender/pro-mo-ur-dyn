import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import {
    BoxGeometry,
    BufferGeometry,
    Color,
    Group,
    InstancedBufferAttribute,
    InstancedMesh,
    InterpolateDiscrete,
    LineBasicMaterial,
    LineSegments,
    Material,
    Matrix4,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Quaternion,
    QuaternionKeyframeTrack,
    SphereGeometry,
    Vector3,
} from "three"
import { MotionEntity, getEntityPositionAt, getEntityRotationAt, getKeyframeIndex } from "pro-3d-video/motion"
import { updateTime, useStore } from "../../state/store.js"
import { useModel } from "./use-model.js"
import { useTexture } from "@react-three/drei"
import shallowEqual from "zustand/shallow"
import { KeyframeTrack, Mesh, Object3D, VectorKeyframeTrack } from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { filterNull } from "../../../../dist/util.js"

const helperMatrix = new Matrix4()
const translateHelper = new Vector3()
const scaleHelper = new Vector3()
const rotationHelper = new Quaternion()

const MaxAgentCount = 100

export function Agents() {
    const agentUrls = useStore(
        (state) =>
            Array.from(
                (state.result.agents as Array<MotionEntity> | undefined)?.reduce((prev, entity) => {
                    prev.add(entity.url)
                    return prev
                }, new Set<string>()) ?? []
            ),
        shallowEqual as any
    )
    return (
        <>
            {agentUrls.map((url) => (
                <AgentType key={url} url={url} />
            ))}
        </>
    )
}

const sphereGeometry = new SphereGeometry(1)
const sphereMaterial = new MeshBasicMaterial({ toneMapped: false, color: "blue", wireframe: true })

const selectedColor = new Color("aqua")
const normalColor = new Color("white")

const vectorHelper1 = new Vector3()
const vectorHelper2 = new Vector3()

const quaternionHelper = new Quaternion()
const ZAXIS = new Vector3(0, 0, 1)

export function AgentType({ url }: { url: string }) {
    const ref1 = useRef<InstancedMesh>(null)
    const ref2 = useRef<InstancedMesh>(null)
    //const ref3 = useRef<InstancedMesh>(null)
    const { entitiyGeometry, entityMaterial, planeGeometry } = useModel(`${url}.glb`)
    const planeTexture = useTexture(`${url}-bg.png`)
    planeTexture.flipY = false
    const planeMaterial = useMemo(
        () => new MeshBasicMaterial({ depthWrite: false, transparent: true, map: planeTexture, toneMapped: false }),
        [planeTexture]
    )
    const instanceColor = useMemo(() => new InstancedBufferAttribute(new Float32Array(MaxAgentCount * 3).fill(1), 3), [])
    useFrame((_, delta) => {
        if (ref1.current == null || ref2.current == null /*|| ref3.current == null*/) {
            return
        }

        updateTime(delta)

        const {
            result: { agents = [] },
            derivedSelection,
        } = useStore.getState()

        const state = useStore.getState()

        ref1.current.count = 0
        ref2.current.count = 0
        ref1.current.userData.indexMapping = []
        //ref3.current.count = 0
        for (let resultIndex = 0; resultIndex < agents?.length ?? 0; resultIndex++) {
            const value = agents[resultIndex]
            if (value.url != url) {
                continue
            }
            const index = getKeyframeIndex(value.keyframes, state.time, 0)
            if (index == null) {
                continue
            }
            ref1.current.userData.indexMapping.push(resultIndex)
            getEntityPositionAt(value.keyframes, state.time, index, translateHelper)
            getEntityRotationAt(value.keyframes, state.time, index, rotationHelper)
            translateHelper.y += 0.15
            helperMatrix.compose(translateHelper, rotationHelper, scaleHelper.setScalar(2.5))
            ref1.current.setMatrixAt(ref1.current.count, helperMatrix)
            ref1.current.setColorAt(
                ref1.current.count,
                derivedSelection.keyframeIndiciesMap.has(resultIndex) ? selectedColor : normalColor
            )
            ref2.current.setMatrixAt(ref1.current.count, helperMatrix)
            helperMatrix.compose(translateHelper, rotationHelper, scaleHelper.setScalar(value.radius))
            //ref3.current.setMatrixAt(ref1.current.count, helperMatrix)
            ref1.current.count++
            ref2.current.count++
            //ref3.current.count++
            if (ref1.current.count === MaxAgentCount) {
                break
            }
        }
        ref1.current.instanceMatrix.needsUpdate = true
        ref2.current.instanceMatrix.needsUpdate = true
        ref1.current.instanceColor!.needsUpdate = true
        //ref3.current.instanceMatrix.needsUpdate = true
    })
    return (
        <>
            <instancedMesh
                onClick={(e) => {
                    useStore.getState().select({ results: [{ index: e.object.userData.indexMapping[e.instanceId!] }] })
                    e.stopPropagation()
                }}
                instanceColor={instanceColor}
                frustumCulled={false}
                args={[entitiyGeometry, entityMaterial, MaxAgentCount]}
                ref={ref1}
            />
            <instancedMesh frustumCulled={false} args={[planeGeometry, planeMaterial, MaxAgentCount]} ref={ref2} />
            {/*<instancedMesh frustumCulled={false} args={[sphereGeometry, sphereMaterial, MaxAgentCount]} ref={ref3} />*/}
        </>
    )
}

const gltfLoader = new GLTFLoader()

export async function exportMotion(objects: Array<Object3D>, tracks: Array<KeyframeTrack>): Promise<void> {
    const motionEntities = useStore.getState().result.agents as Array<MotionEntity> | undefined
    if (motionEntities == null) {
        return
    }
    const geometryMap = new Map<string, BufferGeometry>()
    for (const entity of motionEntities) {
        if (geometryMap.has(entity.url)) {
            continue
        }
        const gltf = await gltfLoader.loadAsync(`${entity.url}.glb`)
        const mesh = gltf.scene.getObjectByName("Entity") as Mesh<BufferGeometry, Material>
        geometryMap.set(entity.url, mesh.geometry)
    }
    objects.push(
        ...motionEntities.map((entity, i) => {
            const geometry = geometryMap.get(entity.url)
            if (geometry == null) {
                throw new Error(`missing geometry for url "${entity.url}"`)
            }
            const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: "white", toneMapped: false }))
            mesh.scale.setScalar(2.5)
            mesh.name = `motion-entity-${i}`
            return mesh
        })
    )
    tracks.push(
        ...motionEntities.map(
            (entity, i) =>
                new VectorKeyframeTrack(
                    `motion-entity-${i}.position`,
                    entity.keyframes.map(({ t }) => t),
                    entity.keyframes.reduce<Array<number>>((prev, { x, y, z }) => {
                        prev.push(x, y + 0.15, z)
                        return prev
                    }, [])
                )
        ),
        ...motionEntities
            .map((entity, i) =>
                entity.keyframes.length > 1
                    ? new QuaternionKeyframeTrack(
                          `motion-entity-${i}.quaternion`,
                          entity.keyframes.slice(0, -1).map(({ t }) => t),
                          entity.keyframes.slice(0, -1).reduce<Array<number>>((prev, k1, i) => {
                              const k2 = entity.keyframes[i + 1]
                              vectorHelper1.set(k1.x, k1.y, k1.z)
                              vectorHelper2.set(k2.x, k2.y, k2.z)
                              vectorHelper2.sub(vectorHelper1)
                              vectorHelper2.normalize()
                              quaternionHelper.setFromUnitVectors(ZAXIS, vectorHelper2)
                              prev.push(...quaternionHelper.toArray())
                              return prev
                          }, []),
                          InterpolateDiscrete
                      )
                    : undefined
            )
            .filter(filterNull)
    )
}
