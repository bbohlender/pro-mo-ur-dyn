import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { Agents } from "./components/viewer/agents.js"
import { useInterpreterResult } from "./state/interpreter.js"
import { Buildings } from "./components/viewer/buildings.js"
import { Pathways } from "./components/viewer/pathways.js"
import { ContactShadows } from "./components/contact-shadow.js"

export default function App() {
    useInterpreterResult()
    return (
        <>
            <Canvas
                shadows
                gl={{ logarithmicDepthBuffer: true, antialias: true }}
                camera={{ far: 10000 }}
                style={{ width: "100vw", height: "100svh" }}>
                <ambientLight intensity={0.5} />
                <directionalLight intensity={0.5} position={[1, 1, 1]} />
                <Agents />
                <Buildings />
                <Pathways />
                <OrbitControls />
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
