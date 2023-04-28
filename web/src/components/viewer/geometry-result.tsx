import { ColorRepresentation } from "three"
import { useStore } from "../../state/store.js"
import { MeshProps } from "@react-three/fiber"

export function GeometryResult({ type, color, ...props }: { type: string; color: ColorRepresentation } & MeshProps) {
    const geometry = useStore((state) => state.result[type])
    if (geometry == null) {
        return null
    }
    return (
        <mesh {...props} geometry={geometry}>
            <meshPhongMaterial toneMapped={false} color={color} />
        </mesh>
    )
}
