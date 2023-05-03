import { PauseIcon, PlayIcon } from "@heroicons/react/20/solid"
import { useEffect, useRef, useState } from "react"
import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"

export function PlayerControls() {
    const barRef = useRef<HTMLDivElement>(null)
    const playing = useStore((state) => state.playing)
    useEffect(() => {
        const interval = setInterval(() => {
            if (barRef.current == null) {
                return
            }
            const fraction = useStore.getState().time / Math.max(0.00001, useStore.getState().duration)
            barRef.current.style.width = `${(fraction * 100).toFixed(3)}%`
        })
        return () => clearInterval(interval)
    }, [])
    return (
        <Panel className="flex flex-row items-center gap-5 p-5">
            <div style={{ minWidth: "3rem", maxWidth: "3rem" }}>
                <button onClick={useStore.getState().togglePlaying} className="btn btn-primary btn-sm btn-circle">
                    {playing ? <PauseIcon height={20} /> : <PlayIcon height={20} />}
                </button>
            </div>
            <div
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                }}
                onPointerUp={(e) => {
                    setTime(e)
                    e.currentTarget.releasePointerCapture(e.pointerId)
                }}
                onPointerMove={(e) => {
                    if (e.buttons === 1) {
                        setTime(e)
                    }
                }}
                className="relative  w-full rounded-xl bg-slate-300">
                <div ref={barRef} style={{ width: 0 }} className="p-1.5 relative rounded-xl bg-primary">
                    <div className="h-3 w-3 top-0 right-0 rounded-full absolute">
                        <Time />
                    </div>
                </div>
            </div>
            <Duration />
        </Panel>
    )
}

function Time() {
    const [time, setTime] = useState("0")
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(useStore.getState().time.toFixed(2))
        }, 100)
        return () => clearInterval(interval)
    }, [])
    return <div className="absolute top-3">{time}</div>
}

function Duration() {
    const duration = useStore((state) => state.duration.toFixed(2))
    return <div style={{ minWidth: "3rem", maxWidth: "3rem" }}>{duration}</div>
}

function setTime(e: React.PointerEvent<HTMLDivElement>) {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const state = useStore.getState()
    state.setTime(((e.clientX - left) / width) * state.duration)
}
