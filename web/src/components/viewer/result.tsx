import { Suspense } from "react"
import { AgentsViewer } from "./agents.js"
import { GeometryResult } from "./geometry-result.js"
import { Orbit } from "../../app.js"
import { useStore } from "../../state/store.js"
import { ContactShadows } from "../contact-shadow.js"

export function ResultView({ result }: { result: any }) {
    const derivedSelection = useStore((state) => (state.mode === "edit" ? state.derivedSelection : undefined))
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight intensity={0.5} position={[1, 1, 1]} />
            <Suspense>
                <AgentsViewer
                    onSelect={(selection) => {
                        const state = useStore.getState()
                        if (state.mode === "multi") {
                            return
                        }
                        state.select(selection)
                    }}
                    derivedSelection={derivedSelection}
                    result={result}
                />
            </Suspense>
            <GeometryResult result={result} color="white" type="building" />
            <GeometryResult result={result} position={[0, 0.05, 0]} color="white" type="footwalk" />
            <GeometryResult result={result} color="gray" type="street" />
            <ContactShadows
                position={[0, -0.175, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                opacity={0.4}
                width={50}
                height={50}
                blur={0.5}
                far={100}
            />
            <Orbit />
        </>
    )
}
