import { BoxGeometry, KeyframeTrack, Mesh, Object3D, VectorKeyframeTrack } from "three"
import { MotionEntity } from "./index.js"

const geometry = new BoxGeometry(0.1, 0.1, 0.1)

export function exportGLTF(result: any, objects: Array<Object3D>, tracks: Array<KeyframeTrack>): void {
    if (!("agents" in result)) {
        return
    }
    const motionEntities = result.agents as Array<MotionEntity>
    objects.push(
        ...motionEntities.map((entity, i) => {
            const mesh = new Mesh(geometry)
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
                        prev.push(x, y, z)
                        return prev
                    }, [])
                )
        )
    )
}
