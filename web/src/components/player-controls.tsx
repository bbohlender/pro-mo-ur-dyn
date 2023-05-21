import { PauseIcon, PlayIcon, VideoCameraIcon, MapIcon, PlusIcon, MinusIcon } from "@heroicons/react/20/solid"
import { useEffect, useRef, useState } from "react"
import { useStore } from "../state/store.js"
import { Panel } from "./panel.js"
import { useViewerState } from "./viewer/state.js"

export function PlayerControls() {
    const barRef = useRef<HTMLDivElement>(null)
    const playing = useStore((state) => state.playing)
    const seed = useStore((state) =>
        parseInt(Object.values(state.descriptions.descriptions)[0]?.initialVariables?.seed ?? "0")
    )
    const viewType = useViewerState((state) => state.viewType)
    useEffect(() => {
        const interval = setInterval(() => {
            if (barRef.current == null) {
                return
            }
            const fraction = useStore.getState().time / Math.max(0.00001, useStore.getState().getDuration())
            barRef.current.style.width = `${(fraction * 100).toFixed(3)}%`
        })
        return () => clearInterval(interval)
    }, [])
    return (
        <Panel className="flex flex-row items-center gap-5 p-5">
            <button
                onClick={() => useViewerState.getState().enterSateliteView()}
                className={`${viewType === "satelite" ? "btn-primary" : "btn-ghost opacity-50"} btn btn-sm btn-circle`}>
                <MapIcon height={20} />
            </button>
            <button
                onClick={() => useViewerState.getState().enterFlyCamera()}
                className={`${viewType === "fly" ? "btn-primary" : "btn-ghost opacity-50"} btn btn-sm btn-circle`}>
                <VideoCameraIcon height={20} />
            </button>
            <button onClick={useStore.getState().togglePlaying} className="mr-2 btn btn-primary btn-sm btn-circle">
                {playing ? <PauseIcon height={20} /> : <PlayIcon height={20} />}
            </button>
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
            <div className="btn-group text-white">
                <button onClick={() => useStore.getState().setSeed(seed - 1)} className="btn btn-sm">
                    <MinusIcon height={20} />
                </button>
                <p className="text-lg px-2 flex items-center bg-gray-700">{seed}</p>
                <button onClick={() => useStore.getState().setSeed(seed + 1)} className="btn btn-sm">
                    <PlusIcon height={20} />
                </button>
            </div>
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
    const duration = useStore((state) => state.getDuration().toFixed(2))
    return <div style={{ minWidth: "3rem", maxWidth: "3rem" }}>{duration}</div>
}

function setTime(e: React.PointerEvent<HTMLDivElement>) {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const state = useStore.getState()
    state.setTime(((e.clientX - left) / width) * state.getDuration())
}
