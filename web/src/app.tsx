import { Canvas } from "@react-three/fiber"
import { Grid, OrbitControls } from "@react-three/drei"
import { Interface2D } from "./components/interface-2d.js"
import { WorkerInterface, parse } from "pro-3d-video"
//@ts-ignore
import Url from "pro-3d-video/dist/domains/motion/worker.js?url"

function startWorker() {
    const workerInterface = new WorkerInterface(
        Url,
        {
            name: "worker",
            type: "module",
        },
        console.log
    )
    workerInterface.interprete(parse(`Test { a --> moveTo(10, 10, 0, 10) }`), 10000)
}

export default function App() {
    return (
        <>
            <Canvas style={{ width: "100vw", height: "100svh" }}>
                <Grid args={[10, 10, 10, 10]} />
                <OrbitControls />
            </Canvas>
            <Interface2D />
            <button
                onClick={startWorker}
                style={{ position: "absolute", top: 0, backgroundColor: "blue", color: "white" }}>
                start ww
            </button>
        </>
    )
}
