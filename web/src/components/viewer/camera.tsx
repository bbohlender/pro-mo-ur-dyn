import { PerspectiveCamera } from "@react-three/drei"
import { PropsWithChildren, useRef } from "react"
import { PerspectiveCamera as PerspectiveCameraImpl } from "three"
import { calculateTransformation, FOV, useViewerState, ViewerState } from "./state.js"
import { PerspectiveCameraProps, useFrame } from "@react-three/fiber"

export function ViewerCamera({ children, ...props }: PropsWithChildren<PerspectiveCameraProps>) {
    const ref = useRef<PerspectiveCameraImpl | undefined>()

    useFrame(() => {
        if (ref.current == null) {
            return
        }
        const state = useViewerState.getState() as any as ViewerState
        calculateTransformation(state, ref.current.position, ref.current.quaternion)
    })

    return <PerspectiveCamera {...props} fov={FOV} ref={ref} far={1000} near={10e-10} children={children} makeDefault />
}
