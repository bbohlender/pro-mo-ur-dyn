import { useEffect, useRef } from "react"
import { useStore } from "../../state/store.js"
import { BackSide, DoubleSide } from "three"

export function Buildings() {
    const geometry = useStore((state) => state.result.buildings)
    if (geometry == null) {
        return null
    }
    return (
        <mesh geometry={geometry}>
            <meshPhongMaterial toneMapped={false} color="white" />
        </mesh>
    )
}
