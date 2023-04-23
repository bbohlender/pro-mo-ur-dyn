import { isMotionEntity } from "pro-3d-video/motion"
import { Value } from "pro-3d-video"
import { useStore } from "../state/store.js"
import { ReactNode, useMemo } from "react"
import { Panel } from "./panel.js"

export function ProceduralLine() {
    const result = useStore((state) => state.result)
    const duration = useStore((state) => state.duration)
    return (
        <Panel className="flex gap-5 flex-col p-5 max-h-10 overflow-y-auto">
            {result
                .filter((value) => isMotionEntity(value.raw))
                .map((value, i) => (
                    <EntityLine key={i} duration={duration} value={value} />
                ))}
        </Panel>
    )
}

function EntityLine({ value, duration }: { value: Value; duration: number }) {
    if (!isMotionEntity(value.raw)) {
        return null
    }
    const entity = value.raw
    const children = useMemo(() => {
        const c: Array<ReactNode> = []
        let lastKeyframeTime: number | undefined = undefined
        for (const keyframe of entity.keyframes) {
            const keyframeTime = keyframe.t

            if (lastKeyframeTime != null) {
                c.push(
                    <div
                        key={keyframeTime}
                        onClick={() => console.log(value)}
                        style={{ flexGrow: keyframeTime - lastKeyframeTime }}
                        className="p-1.5 bg-slate-400 rounded-lg"></div>
                )
            }

            c.push(<div key={keyframeTime + "result"} className="p-1.5 rounded-lg bg-primary"></div>)

            lastKeyframeTime = keyframeTime
        }
        c.push(<div key="end" style={{ flexGrow: duration - (lastKeyframeTime ?? 0) }}></div>)
        return c
    }, [entity])
    return (
        <div className="flex flex-row gap-5 items-center">
            <div style={{ minWidth: "3rem", maxWidth: "3rem", wordBreak: "break-all" }}>Name</div>
            <div className="flex gap-2 flex-row flex-grow">{children}</div>
            <div style={{ minWidth: "3rem", maxWidth: "3rem" }}></div>
        </div>
    )
}
