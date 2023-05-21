import { useRef, useEffect } from "react"
import { Keyframe } from "pro-3d-video/motion"
import { useStore } from "../../state/store.js"
import { BufferGeometry, Group, LineBasicMaterial, LineSegments, Vector3 } from "three"

const lineMaterial = new LineBasicMaterial({ color: "black" })

export function Paths() {
    const ref = useRef<Group>(null)
    useEffect(() => {
        if (ref.current == null) {
            return
        }
        const unsubscribe = useStore.subscribe((state, prevState) => {
            if (ref.current == null) {
                return
            }
            if (state.derivedSelection.keyframeIndiciesMap != prevState.derivedSelection.keyframeIndiciesMap) {
                ref.current.clear()
                for (const keyframesList of state.derivedSelection.keyframeIndiciesMap.values()) {
                    for (const keyframes of keyframesList) {
                        addLines(ref.current, keyframes)
                    }
                }
            }
        })
        const group = ref.current
        const { derivedSelection } = useStore.getState()
        for (const keyframesList of derivedSelection.keyframeIndiciesMap.values()) {
            for (const keyframes of keyframesList) {
                addLines(ref.current, keyframes)
            }
        }
        return () => {
            group.clear()
            unsubscribe()
        }
    }, [])
    return <group ref={ref} />
}

export function addLines(group: Group, keyframes: Array<Keyframe>) {
    const points: Array<Vector3> = []

    for (let i = 1; i < keyframes.length; i++) {
        const p1 = new Vector3(...keyframes[i - 1].position)
        const p2 = new Vector3(...keyframes[i].position)
        p1.y += 0.15
        p2.y += 0.15
        points.push(p1, p2)
    }

    group.add(new LineSegments(new BufferGeometry().setFromPoints(points), lineMaterial))
}
