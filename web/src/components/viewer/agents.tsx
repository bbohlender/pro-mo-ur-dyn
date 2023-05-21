import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
    BufferGeometry,
    Color,
    InstancedBufferAttribute,
    InstancedMesh,
    InterpolateLinear,
    Material,
    Matrix4,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Quaternion,
    QuaternionKeyframeTrack,
    SphereGeometry,
    Vector3,
    Vector4Tuple,
} from "three"
import {
    MotionEntity,
    getEntityPositionAt,
    getEntityRotationAt,
    getKeyframeIndex,
    getRotationPeriod,
} from "pro-3d-video/motion"
import { DerivedSelectionState, PrimarySelectionState, updateTime, useStore } from "../../state/store.js"
import { useModel } from "./use-model.js"
import { useTexture } from "@react-three/drei"
import { KeyframeTrack, Mesh, Object3D, VectorKeyframeTrack } from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { filterNull } from "../../../../dist/util.js"
import { FOV, rotateY180 } from "./state.js"

const helperMatrix = new Matrix4()
const translateHelper = new Vector3()
const scaleHelper = new Vector3()
const rotationHelper = new Quaternion()

const MaxAgentCount = 300

export function AgentsViewer({
    result,
    onSelect,
    derivedSelection,
}: {
    derivedSelection?: DerivedSelectionState
    result: any
    onSelect?: (selection: PrimarySelectionState) => void
}) {
    const agentUrls = useMemo(
        () =>
            Array.from(
                (result.agents as Array<MotionEntity> | undefined)?.reduce((prev, entity) => {
                    if (entity.url != null) {
                        prev.add(entity.url)
                    }
                    return prev
                }, new Set<string>()) ?? []
            ),
        [result]
    )
    return (
        <>
            {agentUrls.map((url) => (
                <AgentType
                    result={result}
                    derivedSelection={derivedSelection}
                    onSelect={onSelect}
                    key={url}
                    url={url}
                />
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

export function AgentType({
    result,
    url,
    onSelect,
    derivedSelection,
}: {
    derivedSelection?: DerivedSelectionState
    result: any
    url: string
    onSelect?: (selection: PrimarySelectionState) => void
}) {
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
    const instanceColor = useMemo(
        () => new InstancedBufferAttribute(new Float32Array(MaxAgentCount * 3).fill(1), 3),
        []
    )
    useFrame((_, delta) => {
        if (ref1.current == null || ref2.current == null /*|| ref3.current == null*/) {
            return
        }

        updateTime(delta)

        const { time } = useStore.getState()

        ref1.current.count = 0
        ref2.current.count = 0
        ref1.current.userData.indexMapping = []
        //ref3.current.count = 0
        if (result.agents != null) {
            for (const agent of result.agents as Array<MotionEntity>) {
                if (agent.url != url) {
                    continue
                }
                const index = getKeyframeIndex(agent.keyframes, time, 0)
                if (index == null) {
                    continue
                }
                ref1.current.userData.indexMapping.push(agent.id)
                getEntityPositionAt(agent.keyframes, time, index, translateHelper)
                getEntityRotationAt(agent.keyframes, time, index, rotationHelper)
                translateHelper.y += 0.15
                helperMatrix.compose(translateHelper, rotationHelper, scaleHelper.setScalar(2.5))
                ref1.current.setMatrixAt(ref1.current.count, helperMatrix)
                ref1.current.setColorAt(
                    ref1.current.count,
                    derivedSelection != null && derivedSelection.keyframeIndiciesMap.has(agent.id)
                        ? selectedColor
                        : normalColor
                )

                ref2.current.setMatrixAt(ref1.current.count, helperMatrix)
                helperMatrix.compose(translateHelper, rotationHelper, scaleHelper.setScalar(agent.radius))
                //ref3.current.setMatrixAt(ref1.current.count, helperMatrix)
                ref1.current.count++
                ref2.current.count++
                //ref3.current.count++
                if (ref1.current.count === MaxAgentCount) {
                    break
                }
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
                    onSelect?.({ results: [{ id: e.object.userData.indexMapping[e.instanceId!] }] })
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
const animationSpeedup = 4

export async function exportMotion(objects: Array<Object3D>, tracks: Array<KeyframeTrack>): Promise<void> {
    const motionEntities = useStore.getState().result.agents as Array<MotionEntity> | undefined
    if (motionEntities == null) {
        return
    }
    const geometryMap = new Map<string, BufferGeometry>()
    for (const entity of motionEntities) {
        if (entity.url == null || geometryMap.has(entity.url)) {
            continue
        }
        const gltf = await gltfLoader.loadAsync(`${entity.url}.glb`)
        const mesh = gltf.scene.getObjectByName("Entity") as Mesh<BufferGeometry, Material>
        geometryMap.set(entity.url, mesh.geometry)
    }
    objects.push(
        ...motionEntities
            .map((entity, i) => {
                const entityName = `motion-entity-${i}`
                if (entity.type === "camera") {
                    const camera = new PerspectiveCamera(FOV, 16 / 9)
                    camera.name = entityName
                    return camera
                }
                if (entity.url == null) {
                    return undefined
                }
                const geometry = geometryMap.get(entity.url)
                if (geometry == null) {
                    throw new Error(`missing geometry for url "${entity.url}"`)
                }
                const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: "white", toneMapped: false }))
                mesh.scale.setScalar(2.5)
                mesh.name = entityName
                return mesh
            })
            .filter(filterNull)
    )
    tracks.push(
        ...motionEntities.map(
            (entity, i) =>
                new VectorKeyframeTrack(
                    `motion-entity-${i}.position`,
                    entity.keyframes.map(({ t }) => t / animationSpeedup),
                    entity.keyframes.reduce<Array<number>>((prev, { position: [x, y, z] }) => {
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
                          entity.keyframes
                              .reduce<Array<number>>((prev, { t, rotation }, i) => {
                                  const nextKeyframe = entity.keyframes[Math.min(i + 1, entity.keyframes.length - 1)]
                                  const rotationPeriod = getRotationPeriod(
                                      rotation,
                                      t,
                                      nextKeyframe.rotation,
                                      nextKeyframe.t
                                  )
                                  prev.push(t, t + rotationPeriod)
                                  return prev
                              }, [])
                              .map((t) => t / animationSpeedup),
                          entity.keyframes.reduce<Array<number>>((prev, keyframe, i) => {
                              const nextRotation =
                                  entity.keyframes[Math.min(i + 1, entity.keyframes.length - 1)].rotation
                              const prevRotation = i === 0 ? nextRotation : keyframe.rotation
                              if (entity.type === "camera") {
                                  prev.push(...fixCameraRotation(prevRotation), ...fixCameraRotation(nextRotation))
                              } else {
                                  prev.push(...prevRotation, ...nextRotation)
                              }
                              return prev
                          }, []),
                          InterpolateLinear
                      )
                    : undefined
            )
            .filter(filterNull)
    )
}

function fixCameraRotation(rotation: Vector4Tuple) {
    quaternionHelper.set(...rotation)
    quaternionHelper.multiply(rotateY180)
    return quaternionHelper.toArray()
}
