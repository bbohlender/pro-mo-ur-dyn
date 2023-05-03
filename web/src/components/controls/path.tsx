import { useRef, useEffect, ReactNode } from "react"
import { Group, Vector3, LineSegments, BufferGeometry } from "three"
import { MotionEntity } from "pro-3d-video/motion"
import { useStore } from "../../state/store.js"
import { Point2Control } from "./point.js"

export function PathControl() {
    const show = useStore((state) => state.showAgentPaths)
    const agents = (useStore((state) => state.result.agents) as Array<MotionEntity>) ?? []
    const ref = useRef<Group>(null)
    if (!show) {
        return null
    }
    return (
        <>
            {agents.reduce<Array<ReactNode>>(
                (prev, agent) =>
                    prev.concat(
                        agent.keyframes.map((keyframe) => (
                            <Point2Control x={keyframe.x} z={keyframe.z} astId={keyframe.astId} parameterIndex={0} />
                        ))
                    ),
                []
            )}
        </>
    )
}
