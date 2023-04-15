import Image from "next/image"
import { Inter } from "next/font/google"
import { wrap } from "comlink"
import { Value } from "../../../src/interpreter"
import { NewWorker, workerStart } from "../../libs/worker"

const inter = Inter({ subsets: ["latin"] })

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <button onClick={workerStart} style={{ backgroundColor: "blue", color: "white" }}>
            start ww
            </button>
        </main>
    )
}
