import { Canvas } from "@react-three/fiber"
import { ContactShadows, Environment, Grid, OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { Agents } from "./components/viewer/agents.js"
import { useInterpreterResult } from "./state/interpreter.js"
import { Buildings } from "./components/viewer/buildings.js"
import { Suspense } from "react"

export default function App() {
    useInterpreterResult()
    return (
        <>
            <Canvas
                shadows
                gl={{ antialias: false }}
                camera={{ far: 10000 }}
                style={{ width: "100vw", height: "100svh" }}>
                <ambientLight intensity={0.5} />
                <directionalLight intensity={0.7} position={[1, 1, 1]} />
                <Agents />
                <Buildings />
                <OrbitControls />
                <ContactShadows
                    rotation={[Math.PI / 2, 0, 0]}
                    position={[0, -0.1, 0]}
                    opacity={0.2}
                    width={5}
                    height={5}
                    blur={0.5}
                    far={40}
                />
                <Suspense fallback={null}>
                    <Environment preset="city" />
                </Suspense>
            </Canvas>
            <Interface2D />
        </>
    )
}
