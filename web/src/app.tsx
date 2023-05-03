import { Canvas, events } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { Agents } from "./components/viewer/agents.js"
import { GeometryResult } from "./components/viewer/geometry-result.js"
import { ContactShadows } from "./components/contact-shadow.js"
import { Suspense } from "react"
import { useStore } from "./state/store.js"
import { DragEvent } from "react"
import { parse } from "pro-3d-video"
import { useKeyboard } from "./components/use-keyboard.js"
import { PathControl } from "./components/controls/path.js"
import { Paths } from "./components/viewer/path.js"

async function onDrop(e: DragEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.preventDefault()
    if (e.dataTransfer?.files.length === 1) {
        try {
            const text = await e.dataTransfer.files[0].text()
            const parsed = parse(text)
            useStore.getState().finishTextEdit(parsed)
        } catch (error: any) {
            alert(error.message)
        }
    }
}

export default function App() {
    useKeyboard()
    return (
        <>
            <Canvas
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onPointerMissed={(e) => {
                    if (e.buttons === 0) {
                        useStore.getState().unselect()
                    }
                }}
                shadows
                gl={{ logarithmicDepthBuffer: true, antialias: true }}
                camera={{ far: 10000 }}
                style={{ width: "100vw", height: "100svh" }}>
                <ambientLight intensity={0.5} />
                <directionalLight intensity={0.5} position={[1, 1, 1]} />
                <Suspense>
                    <Agents />
                </Suspense>
                <Paths />
                <PathControl />
                <GeometryResult color="white" type="building" />
                <GeometryResult position={[0, 0.05, 0]} color="white" type="footwalk" />
                <GeometryResult color="gray" type="street" />
                <Orbit />
                <ContactShadows
                    position={[0, -0.2, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    opacity={0.4}
                    width={50}
                    height={50}
                    blur={0.5}
                    far={100}
                />
                {/*<Suspense fallback={null}>
                    <Environment preset="city" />
    </Suspense>*/}
            </Canvas>
            <Interface2D />
        </>
    )
}

function Orbit() {
    const controlling = useStore((state) => state.controlling)
    return <OrbitControls enabled={!controlling} />
}
