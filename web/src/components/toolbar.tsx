import { useStore } from "../state/store.js"
import { NestedDescriptions, parse, serializeString } from "pro-3d-video"
import { Panel } from "./panel.js"
import simplify from "simplify-js"
import { AnimationClip, KeyframeTrack, Object3D } from "three"
import { GLTFExporter, GLTFExporterOptions } from "three/examples/jsm/exporters/GLTFExporter.js"
import {
    convertLotsToDescriptions,
    convertPathwaysToDescription,
    loadMapLayers,
    tileMeterRatio,
} from "../state/mapbox.js"
import { exportGeometryResult } from "./viewer/geometry-result.js"
import { exportMotion } from "./viewer/agents.js"
import { PropsWithChildren, useRef, useState } from "react"

export function Toolbar() {
    return (
        <Panel className="navbar overflow-visible flex-wrap">
            <DropdownItem label="Import">
                <div onClick={() => importAgents(0.2, 0.1)} className="btn btn-outline border-slate-300 btn-sm">
                    Agents
                </div>
                <div
                    onClick={() => importBuildingsPathways("new-york.mvt")}
                    className="btn btn-outline border-slate-300 btn-sm">
                    New York
                </div>
                <div
                    onClick={() => importBuildingsPathways("frankfurt.mvt")}
                    className="btn btn-outline border-slate-300 btn-sm">
                    Frankfurt
                </div>
            </DropdownItem>
            <DropdownItem label="Delete">
                <div
                    onClick={() => useStore.getState().deleteType("building")}
                    className="btn btn-outline border-slate-300 btn-sm">
                    Buildings
                </div>
                <div
                    onClick={() => useStore.getState().deleteType("footwalk", "street")}
                    className="btn btn-outline border-slate-300 btn-sm">
                    Pathways
                </div>
                <div
                    onClick={() => useStore.getState().deleteType(undefined, "pedestrian", "cyclist", "bus", "car")}
                    className="btn btn-outline border-slate-300 btn-sm">
                    Agents
                </div>
            </DropdownItem>
            <DropdownItem label="Add">
                <NumberInputAndButton
                    onClick={(amount) => useStore.getState().addProceduralAgents(amount, "pedestrian", "footwalk")}
                    label="Pro. Pedestrians"
                />
                <NumberInputAndButton
                    onClick={(amount) => useStore.getState().addProceduralAgents(amount, "cyclist", "street")}
                    label="Pro. Cyclist"
                />
                <NumberInputAndButton
                    onClick={(amount) => useStore.getState().addProceduralAgents(amount, "car", "street")}
                    label="Pro. Cars"
                />
                <NumberInputAndButton
                    onClick={(amount) => useStore.getState().addProceduralAgents(amount, "bus", "street")}
                    label="Pro. Busses"
                />
            </DropdownItem>
            <DropdownItem label="Derive">
                <div
                    onClick={() => useStore.getState().enterDeriveBuildingsAndPathways()}
                    className="btn btn-outline border-slate-300 btn-sm"
                    style={{ lineHeight: 1.5, height: "3rem" }}>
                    Buildings & Pathways
                </div>
            </DropdownItem>
            <DropdownItem label="View">
                <div
                    onClick={() => useStore.getState().enterMultiScenario()}
                    className="btn btn-outline border-slate-300 btn-sm">
                    Scenarios
                </div>
            </DropdownItem>
            <DropdownItem label="Download">
                <div onClick={exportScene} className="btn btn-outline border-slate-300 btn-sm">
                    .GLB
                </div>
                <div onClick={downloadText} className="btn btn-outline border-slate-300 btn-sm">
                    .CGV
                </div>
            </DropdownItem>
        </Panel>
    )
}

function DropdownItem({ children, label }: PropsWithChildren<{ label: string }>) {
    const [open, setOpen] = useState(false)
    return (
        <div className="dropdown dropdown-open" onPointerOver={() => setOpen(true)} onPointerOut={() => setOpen(false)}>
            <label className="btn btn-ghost">{label}</label>
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{ minWidth: "13rem" }}
                    className="dropdown-content flex flex-col p-2 shadow bg-base-100 rounded-box gap-2">
                    {children}
                </div>
            )}
        </div>
    )
}

async function downloadText() {
    const text = serializeString(useStore.getState().descriptions)

    const a = document.createElement("a")
    a.href = window.URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    a.download = `scene.cgv`
    a.click()
}

function NumberInputAndButton({ label, onClick }: { label: string; onClick: (value: number) => void }) {
    const ref = useRef<HTMLInputElement>(null)
    return (
        <div className="input-group flex flex-row">
            <input
                ref={ref}
                type="number"
                defaultValue={10}
                style={{ width: "5rem" }}
                className="input input-bordered"
            />
            <button
                onClick={() => onClick(ref.current!.valueAsNumber)}
                className="btn btn-outline border-slate-300 border-l-0 flex-grow whitespace-nowrap">
                {label}
            </button>
        </div>
    )
}

const gltfExporter = new GLTFExporter()

async function exportScene() {
    const duration = useStore.getState().getDuration()

    const objects: Array<Object3D> = []
    const tracks: Array<KeyframeTrack> = []

    exportGeometryResult(objects, tracks, "building", "white")
    exportGeometryResult(objects, tracks, "footwalk", "white", [0, 0.05, 0])
    exportGeometryResult(objects, tracks, "street", "gray")

    await exportMotion(objects, tracks)

    const root = new Object3D()
    root.add(...objects)
    const binary = (await gltfExporter.parseAsync(root, {
        binary: true,
        forceIndices: true,
        animations: [new AnimationClip("animation", duration, tracks)],
    })) as ArrayBuffer

    const a = document.createElement("a")
    a.href = window.URL.createObjectURL(new Blob([binary], { type: "model/gltf-binary" }))
    a.download = `scene.glb`
    a.click()
}

const defaultDescription = parse(`Default (type: "building", interprete: false) {
    Building--> this
}`)

async function importBuildingsPathways(url: string) {
    const layers = await loadMapLayers(url, 98516, 18)
    useStore.getState().addDescriptions({
        ...defaultDescription,
        ...convertLotsToDescriptions(layers),
        Streets: convertPathwaysToDescription(layers, 10, "street", ["street", "secondary"]),
        Footwalks: convertPathwaysToDescription(layers, 3, "footwalk", ["footwalk", "path"]),
    })
}

async function importAgents(spaceScale: number, timeScale: number) {
    const text = await (await fetch("bookstore0.txt")).text()
    const dataset = text.split("\n").map((line) => line.split(" "))
    const map = new Map<
        string,
        {
            x1: number
            y1: number
            x2: number
            y2: number
            t: number
            u1: number
            u2: number
            u3: number
            type: string
        }[]
    >()
    for (const [id, x1, y1, x2, y2, t, u1, u2, u3, type] of dataset) {
        const entry = map.get(id) ?? []
        entry.push({
            x1: +x1 * spaceScale,
            y1: +y1 * spaceScale,
            x2: +x2 * spaceScale,
            y2: +y2 * spaceScale,
            t: +t * timeScale,
            u1: +u1,
            u2: +u2,
            u3: +u3,
            type,
        })
        map.set(id, entry)
    }
    const descriptions: NestedDescriptions = {}

    for (const [name, keyframes] of map.entries()) {
        const regex = /\"/g
        const typeName: string | undefined = keyframes[0].type?.replace(regex, "")
        let type: string
        switch (typeName) {
            case "Bus":
            case "Car":
            case "Pedestrian":
                type = typeName.toLocaleLowerCase()
                break
            case "Biker":
                type = "cyclist"
                break
            default:
                continue
        }
        const simplifiedKeyframes = simplify(
            keyframes.map((data) => ({ ...getCenter(data), t: data.t })),
            1
        ) as Array<{
            x: number
            y: number
            t: number
        }>
        let lastTime = simplifiedKeyframes[0].t
        const startCenter = simplifiedKeyframes[0]
        descriptions[name] = {
            initialVariables: { x: startCenter.x, y: 0, z: startCenter.y, t: lastTime, type },
            nouns: {
                Start: {
                    transformation: {
                        type: "sequential",
                        children: simplifiedKeyframes.slice(1).map(({ x, y, t }) => {
                            const deltaT = t - lastTime
                            lastTime = t
                            return {
                                type: "operation",
                                children: [
                                    { type: "raw", value: x },
                                    { type: "raw", value: 0 },
                                    { type: "raw", value: y },
                                    { type: "raw", value: deltaT },
                                ],
                                identifier: "moveTo",
                            }
                        }),
                    },
                },
            },
            rootNounIdentifier: "Start",
        }
    }

    useStore.getState().addDescriptions(descriptions)
}

function getCenter({ x1, x2, y1, y2 }: { x1: number; y1: number; x2: number; y2: number }): { x: number; y: number } {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
    }
}
