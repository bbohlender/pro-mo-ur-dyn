import { useEffect } from "react"
import { WorkerInterface, nestAST } from "pro-3d-video"
//@ts-ignore
import Url from "pro-3d-video/motion/worker?url"
import { useStore } from "./store.js"

export function useInterpreterResult() {
    const descriptions = useStore((state) => state.descriptions)
    useEffect(() => {
        const workerInterface = new WorkerInterface(
            Url,
            {
                name: "worker",
                type: "module",
            },
            useStore.getState().replaceResult
        )
        workerInterface.interprete(nestAST(descriptions, true), 10)
        return workerInterface.terminate.bind(workerInterface)
    }, [descriptions])
}
