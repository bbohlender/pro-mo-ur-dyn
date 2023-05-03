import { MotionEntity, Keyframe, getKeyframeIndex } from "pro-3d-video/motion"
import { AppState, useStore } from "../state/store.js"
import { Panel } from "./panel.js"
import { generateUUID } from "three/src/math/MathUtils.js"
import { Key, RefObject, useEffect, useMemo, useRef } from "react"

const lineHeight = 3
const yPadding = 1
const xPadding = 1
const fontSize = 1
const circleSize = 0.5

const textWidth = 5

export function ProceduralLine() {
    const panelRef = useRef<HTMLDivElement>(null)
    const svgTextRef = useRef<SVGSVGElement>(null)
    const svgLinesRef = useRef<SVGSVGElement>(null)
    const agentsLength = useStore((state) => state.result.agents?.length ?? 0) as number

    const functions = useMemo(() => {
        let textsIndex = 0
        const texts: Array<SVGTextElement> = []

        let circlesIndex = 0
        const circles: Array<SVGCircleElement> = []

        let rectsIndex = 0
        const rects: Array<SVGRectElement> = []

        return {
            createText() {
                if (textsIndex < texts.length) {
                    const result = texts[textsIndex++]
                    result.setAttribute("visibility", "visible")
                    return result
                }

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
                svgTextRef.current!.appendChild(text)

                texts.push(text)
                return text
            },
            createCircle() {
                if (circlesIndex < circles.length) {
                    const result = circles[circlesIndex++]
                    result.setAttribute("visibility", "visible")
                    return result
                }
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
                svgLinesRef.current!.appendChild(circle)

                circles.push(circle)
                return circle
            },
            createRect() {
                if (rectsIndex < rects.length) {
                    const result = rects[rectsIndex++]
                    result.setAttribute("visibility", "visible")
                    return result
                }
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                svgLinesRef.current!.appendChild(rect)

                rects.push(rect)
                return rect
            },
            reset() {
                for (const rect of rects) {
                    rect.setAttribute("visibility", "hidden")
                }
                for (const text of texts) {
                    text.setAttribute("visibility", "hidden")
                }
                for (const circle of circles) {
                    circle.setAttribute("visibility", "hidden")
                }
                textsIndex = 0
                circlesIndex = 0
                rectsIndex = 0
            },
        }
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            if (panelRef.current == null || svgLinesRef.current == null || svgTextRef.current == null) {
                return
            }
            const state = useStore.getState()
            const agents = state.result.agents as Array<MotionEntity> | undefined
            if (agents == null) {
                return
            }

            const panelBounding = panelRef.current.getBoundingClientRect()

            const lineHeightPixels = convertRemToPixels(lineHeight)
            const startIndex = Math.floor(panelRef.current.scrollTop / lineHeightPixels)
            const endIndex = Math.min(
                agents.length - 1,
                Math.ceil((panelRef.current.scrollTop + panelBounding.height) / lineHeightPixels)
            )

            svgTextRef.current.style.minWidth = rem(textWidth)
            svgTextRef.current.style.minHeight = rem(agents.length * lineHeight)

            svgLinesRef.current.style.left = rem(textWidth)
            svgLinesRef.current.style.minWidth = (panelBounding.width - convertRemToPixels(textWidth)).toString()
            svgLinesRef.current.style.minHeight = rem(agents.length * lineHeight)

            functions.reset()
            for (let i = startIndex; i <= endIndex; i++) {
                updateEntitiyLine(
                    state,
                    svgLinesRef.current!.getBoundingClientRect().width,
                    agents,
                    i,
                    functions.createText,
                    functions.createCircle,
                    functions.createRect
                )
            }
        }, 30)
        return () => {
            clearInterval(interval)
        }
    }, [functions])

    if (agentsLength === 0) {
        return null
    }

    return (
        <Panel ref={panelRef} className="flex gap-5 flex-col max-h-40 overflow-y-auto">
            <svg className="overflow-hidden" ref={svgTextRef} />
            <svg className="absolute left-0 overflow-hidden" ref={svgLinesRef} overflow="hidden">
                <line stroke="black" strokeWidth={2} y1="0%" y2="100%" x1="50%" x2="50%" />
            </svg>
        </Panel>
    )
}

function convertRemToPixels(rem: number) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

function rem(x: number) {
    return `${x}rem`
}

const lineDuration = 10

function updateEntitiyLine(
    state: AppState,
    lineWidth: number,
    entities: Array<MotionEntity>,
    entityIndex: number,
    createText: () => SVGTextElement,
    createCircle: () => SVGCircleElement,
    createRect: () => SVGRectElement
): void {
    const lineStartY = entityIndex * lineHeight
    const text = createText()
    text.innerHTML = "Name"
    text.setAttribute("x", rem(xPadding))
    text.setAttribute("y", rem(yPadding + lineStartY + fontSize))
    text.setAttribute("fontSize", rem(fontSize))

    const beginTime = state.time - lineDuration / 2
    const endTime = state.time + lineDuration / 2

    const entity = entities[entityIndex]
    let keyframeIndex = 0
    const t = Math.max(0, beginTime)
    while (keyframeIndex + 1 < entity.keyframes.length && entity.keyframes[keyframeIndex + 1].t < t) {
        keyframeIndex++
    }

    if (keyframeIndex + 1 >= entity.keyframes.length) {
        return
    }

    //keyframeIndex is now one before the first keyframe that is between begin and end

    while (keyframeIndex + 1 < entity.keyframes.length && entity.keyframes[keyframeIndex].t < endTime) {
        const circle = createCircle()
        circle.setAttribute("r", rem(circleSize / 2))
        circle.setAttribute(
            "cx",
            (((entity.keyframes[keyframeIndex].t - beginTime) / lineDuration) * lineWidth).toString()
        )
        circle.setAttribute("cy", rem(yPadding + lineStartY + fontSize / 2))
        circle.setAttribute("fill", "red")

        const rect = createRect()

        rect.setAttribute("y", rem(yPadding + lineStartY + fontSize / 2 - circleSize / 2))
        rect.setAttribute(
            "x",
            (
                ((entity.keyframes[keyframeIndex].t - beginTime) / lineDuration) * lineWidth +
                convertRemToPixels(circleSize)
            ).toString()
        )

        rect.setAttribute("rx", "5")
        rect.setAttribute(
            "width",
            Math.max(
                0,
                ((entity.keyframes[keyframeIndex + 1].t - entity.keyframes[keyframeIndex].t) / lineDuration) *
                    lineWidth -
                    convertRemToPixels(circleSize) * 2
            ).toString()
        )

        rect.setAttribute("height", rem(circleSize))

        keyframeIndex++
    }
}
