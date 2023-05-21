// The author of the original code is @mrdoob https://twitter.com/mrdoob
// https://threejs.org/examples/?q=con#webgl_shadow_contact

import { useThree } from "@react-three/fiber"
import { HorizontalBlurShader, VerticalBlurShader } from "three-stdlib"
import {
    ColorRepresentation,
    Group,
    Mesh,
    OrthographicCamera,
    PlaneGeometry,
    ShaderMaterial,
    WebGLRenderTarget,
} from "three"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useStore } from "../state/store.js"
import { MotionEntity } from "pro-3d-video/motion"
import { addLines } from "./viewer/path.js"

export type DerivedRoadsProps = {
    size?: number
    far?: number
    resolution?: number
    scale?: number
    type: "Street" | "Footwalk" | "Buildings"
    invert?: boolean
    color: ColorRepresentation
    includeTypes?: Array<string | undefined>
}

export function DeriveVisualization({
    scale = 10,
    size = 1,
    far = 10,
    resolution = 1024,
    renderOrder,
    type,
    invert,
    color,
    includeTypes,
    ...props
}: Omit<JSX.IntrinsicElements["group"], "scale"> & DerivedRoadsProps) {
    const gl = useThree((state) => state.gl)
    const shadowCamera = useRef<OrthographicCamera>(null)

    size = size * scale

    const [
        renderTarget,
        planeGeometry,
        blurPlane,
        horizontalBlurMaterial,
        verticalBlurMaterial,
        thresholdMaterial,
        renderTargetBlur,
    ] = useMemo(() => {
        const renderTarget = new WebGLRenderTarget(resolution, resolution)
        const renderTargetBlur = new WebGLRenderTarget(resolution, resolution)
        renderTargetBlur.texture.generateMipmaps = renderTarget.texture.generateMipmaps = false
        const planeGeometry = new PlaneGeometry(size, size).rotateX(Math.PI / 2)
        const blurPlane = new Mesh(planeGeometry)

        const horizontalBlurMaterial = new ShaderMaterial(HorizontalBlurShader)
        const verticalBlurMaterial = new ShaderMaterial(VerticalBlurShader)
        const thresholdMaterial = new ShaderMaterial(ThresholdShader)
        verticalBlurMaterial.depthTest = horizontalBlurMaterial.depthTest = false
        return [
            renderTarget,
            planeGeometry,
            blurPlane,
            horizontalBlurMaterial,
            verticalBlurMaterial,
            thresholdMaterial,
            renderTargetBlur,
        ]
    }, [resolution, size, scale])

    const blurShadows = (blur: number) => {
        blurPlane.visible = true

        blurPlane.material = horizontalBlurMaterial
        horizontalBlurMaterial.uniforms.tDiffuse.value = renderTarget.texture
        horizontalBlurMaterial.uniforms.h.value = (blur * 1) / 256

        gl.setRenderTarget(renderTargetBlur)
        gl.render(blurPlane, shadowCamera.current!)

        blurPlane.material = verticalBlurMaterial
        verticalBlurMaterial.uniforms.tDiffuse.value = renderTargetBlur.texture
        verticalBlurMaterial.uniforms.v.value = (blur * 1) / 256

        gl.setRenderTarget(renderTarget)
        gl.render(blurPlane, shadowCamera.current!)

        blurPlane.visible = false
    }

    const thresholdShadows = (treshold: number, invert: boolean) => {
        blurPlane.visible = true

        blurPlane.material = thresholdMaterial
        thresholdMaterial.uniforms.threshold.value = treshold
        thresholdMaterial.uniforms.invert.value = invert ? 1 : 0
        thresholdMaterial.uniforms.tDiffuse.value = renderTarget.texture

        gl.setRenderTarget(renderTargetBlur)
        gl.render(blurPlane, shadowCamera.current!)

        blurPlane.visible = false
    }

    const updateTexture = useCallback(
        (entities: Array<MotionEntity>, threshold: number, pixels?: Uint8Array) => {
            if (shadowCamera.current == null) {
                return
            }

            const group = new Group()

            for (const entitiy of entities) {
                if (includeTypes == null || includeTypes.includes(entitiy.type)) {
                    addLines(group, entitiy.keyframes)
                }
            }

            gl.setRenderTarget(renderTarget)
            gl.render(group, shadowCamera.current)

            for (let i = 0; i < 7; i++) {
                blurShadows(0.6)
            }
            thresholdShadows(threshold, invert ?? false)
            if (pixels != null) {
                const ctx = gl.getContext()
                ctx.readPixels(
                    0,
                    0,
                    renderTargetBlur.width,
                    renderTargetBlur.height,
                    ctx.RGBA,
                    ctx.UNSIGNED_BYTE,
                    pixels
                )
            }
            gl.setRenderTarget(null)
        },
        [gl, type]
    )

    useEffect(() => {
        const state = useStore.getState()
        setTimeout(() => updateTexture(state.result.agents ?? [], state[`deriveThreshold${type}`]), 0)

        state[`confirmDerived${type}`] = async () => {
            const state = useStore.getState()
            const bufferSize = renderTargetBlur.width * renderTargetBlur.height * 4
            const pixels = new Uint8Array(bufferSize)
            updateTexture(state.result.agents ?? [], state[`deriveThreshold${type}`], pixels)
            const imageData = new ImageData(renderTargetBlur.width, renderTargetBlur.height)
            //copy texture data to Image data where format is RGBA
            for (let i = 0; i < bufferSize; i++) {
                imageData.data[i] = pixels[i]
            }
            return {
                imageData,
                ratio: size / renderTargetBlur.width,
                offset: -size / 2,
            }
        }

        return useStore.subscribe((cur, prev) => {
            if (
                cur.result.agents != prev.result.agents ||
                cur[`deriveThreshold${type}`] != prev[`deriveThreshold${type}`]
            ) {
                updateTexture(cur.result.agents ?? [], cur[`deriveThreshold${type}`])
            }
        })
    }, [type])

    return (
        <group rotation-x={Math.PI / 2} {...props}>
            <mesh renderOrder={renderOrder} geometry={planeGeometry} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
                <meshBasicMaterial
                    color={color}
                    transparent
                    map={renderTargetBlur.texture}
                    map-encoding={gl.outputEncoding}
                />
            </mesh>
            <orthographicCamera ref={shadowCamera} args={[-size / 2, size / 2, size / 2, -size / 2, 0, far]} />
        </group>
    )
}

const ThresholdShader = {
    uniforms: {
        threshold: {
            value: 0.5,
        },
        invert: {
            value: 0,
        },
        tDiffuse: {
            value: null,
        },
    },
    vertexShader:
        /* glsl */
        `
        varying vec2 vUv;
  
        void main() {
  
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  
        }
    `,
    fragmentShader:
        /* glsl */
        `
      uniform sampler2D tDiffuse;
      uniform float threshold;
      uniform float invert;
  
      varying vec2 vUv;
  
      void main() {
          float x = texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ).w;
          if(invert > 0.5) {
            x = 1.0 - x;
          }
          gl_FragColor = x > threshold ? vec4(1.0) : vec4(0.0);
  
      }
    `,
}
