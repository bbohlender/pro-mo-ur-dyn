import { PauseIcon, PlayIcon } from "@heroicons/react/20/solid"
import { useState } from "react"
import { Panel } from "./panel.js"

export function PlayerControls() {
    const [playing, setPlaying] = useState(false)
    return (
        <Panel>
            <div className="flex gap-5 flex-row items-center p-5">
                <button onClick={() => setPlaying((p) => !p)} className="btn btn-primary btn-sm btn-circle">
                    {playing ? <PlayIcon height={20} /> : <PauseIcon height={20} />}
                </button>
                <div className="relative w-full rounded-xl bg-slate-300">
                    <div style={{ width: "10%" }} className="p-1.5 rounded-xl bg-primary h-0"></div>
                </div>
            </div>
        </Panel>
    )
}
