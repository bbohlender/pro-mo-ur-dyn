import { Canvas } from "@react-three/fiber"
import { PlayerControls } from "./components/player-controls.js"
import { Grid, OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { workerStart } from "libs/worker.js"

export default function App() {
    return (
        <>
            <Canvas style={{ width: "100vw", height: "100svh" }}>
                <Grid args={[10, 10, 10, 10]} />
                <OrbitControls />
            </Canvas>
            <Interface2D />
            <button onClick={workerStart} style={{ backgroundColor: "blue", color: "white" }}>
                start ww
            </button>
        </>
    )
}
