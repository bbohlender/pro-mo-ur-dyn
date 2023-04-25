import { BackSide } from "three"
import { useStore } from "../../state/store.js"

export function Pathways() {
    const geometry = useStore((state) => state.result.pathways)
    if (geometry == null) {
        return null
    }
    return (
        <mesh geometry={geometry}>
            <meshPhongMaterial toneMapped={false} side={BackSide} color="gray" />
        </mesh>
    )
}
