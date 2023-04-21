import { Canvas } from "@react-three/fiber"
import { Grid, OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { Viewer } from "./components/viewer/index.js"
import { useInterpreterResult } from "./state/interpreter.js"

export default function App() {
    useInterpreterResult()
    return (
        <>
            <Canvas style={{ width: "100vw", height: "100svh" }}>
                <Grid args={[10, 10, 10, 10]} />
                <Viewer />
                <OrbitControls />
            </Canvas>
            <Interface2D />
        </>
    )
}
