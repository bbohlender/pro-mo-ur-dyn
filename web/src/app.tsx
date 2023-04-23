import { Canvas } from "@react-three/fiber"
import { Grid, OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { Agents } from "./components/viewer/agents.js"
import { useInterpreterResult } from "./state/interpreter.js"
import { Buildings } from "./components/viewer/buildings.js"

export default function App() {
    useInterpreterResult()
    return (
        <>
            <Canvas camera={{ far: 10000 }} style={{ width: "100vw", height: "100svh" }}>
                <Grid args={[10, 10, 10, 10]} />
                <ambientLight intensity={0.5}/>
                <directionalLight intensity={0.7} position={[1,1,1]}/>
                <Agents />
                <Buildings />
                <OrbitControls />
            </Canvas>
            <Interface2D />
        </>
    )
}
