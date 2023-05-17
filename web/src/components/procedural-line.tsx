import { MotionEntity, Keyframe, getKeyframeIndex } from "pro-3d-video/motion"
import { AppState, useStore } from "../state/store.js"
import { Panel } from "./panel.js"
import { generateUUID } from "three/src/math/MathUtils.js"
import { Key, RefObject, useEffect, useMemo, useRef } from "react"

const lineHeight = 3
const yPadding = 1
const xPadding = 1
const fontSize = 1
const circleSize = 0.8

const textWidth = 6

export function ProceduralLine() {
    const panelRef = useRef<HTMLDivElement>(null)
    const svgTextRef = useRef<SVGSVGElement>(null)
    const svgLinesRef = useRef<SVGSVGElement>(null)
    const agentsLength = useStore((state) => state.result.agents?.length ?? 0) as number

    const functions = useMemo(() => {
        let textsIndex = 0
        const texts: Array<SVGTextElement> = []

        let textRectsIndex = 0
        const textRects: Array<SVGRectElement> = []

        let circlesIndex = 0
        const circles: Array<SVGCircleElement> = []

        let rectsIndex = 0
        const rects: Array<SVGRectElement> = []

        return {
            createText() {
                if (textsIndex < texts.length) {
                    const text = texts[textsIndex++]
                    text.setAttribute("visibility", "visible")
                    return text
                }
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
                texts.push(text)
                svgTextRef.current!.appendChild(text)
                return text
            },
            createTextRect() {
                let rect: SVGRectElement
                if (textRectsIndex < textRects.length) {
                    rect = textRects[textRectsIndex++]
                    rect.setAttribute("visibility", "visible")
                    rect.remove()
                } else {
                    rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                    textRects.push(rect)
                }
                svgTextRef.current!.prepend(rect)

                return rect
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
                for (const textRect of textRects) {
                    textRect.setAttribute("visibility", "hidden")
                }
                textsIndex = 0
                circlesIndex = 0
                rectsIndex = 0
                textRectsIndex = 0
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
                    i,
                    agents[i],
                    functions.createText,
                    functions.createTextRect,
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
        <Panel>
            <div ref={panelRef} className="max-h-40 overflow-y-auto relative">
                <svg className="overflow-hidden" ref={svgTextRef} />
                <svg className="absolute top-0 left-0 overflow-hidden" ref={svgLinesRef} overflow="hidden">
                    <line stroke="black" strokeWidth={2} y1="0%" y2="100%" x1="50%" x2="50%" />
                </svg>
            </div>
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
    entityIndex: number,
    entity: MotionEntity,
    createText: () => SVGTextElement,
    createTextRect: () => SVGRectElement,
    createCircle: () => SVGCircleElement,
    createRect: () => SVGRectElement
): void {
    const lineStartY = entityIndex * lineHeight

    const selected = state.derivedSelection.keyframeIndiciesMap.has(entity.id)

    if (selected) {
        const textBg = createTextRect()
        textBg.setAttribute("x", rem(xPadding - 0.5))
        textBg.setAttribute("y", rem(yPadding + lineStartY - 0.5))
        textBg.setAttribute("width", rem(textWidth - 2 * (xPadding - 0.5)))
        textBg.setAttribute("height", rem(fontSize + 1))
        textBg.setAttribute("rx", "5")
        textBg.setAttribute("fill", "aqua")
    }

    const text = createText()
    text.innerHTML = "Name"
    text.onclick = () => {
        useStore.getState().select({ results: [{ id: entity.id }] })
    }
    text.setAttribute("x", rem(xPadding))
    text.setAttribute("y", rem(yPadding + lineStartY + fontSize))
    text.setAttribute("fontSize", rem(fontSize))

    const beginTime = state.time - lineDuration / 2
    const endTime = state.time + lineDuration / 2

    let keyframeIndex = 0
    const t = Math.max(0, beginTime)
    while (keyframeIndex + 1 < entity.keyframes.length && entity.keyframes[keyframeIndex + 1].t < t) {
        keyframeIndex++
    }

    if (keyframeIndex + 1 >= entity.keyframes.length) {
        return
    }

    //keyframeIndex is now one before the first keyframe that is between begin and end

    let currentSelected = state.derivedSelection.keyframes.includes(entity.keyframes[keyframeIndex])
    while (keyframeIndex + 1 < entity.keyframes.length && entity.keyframes[keyframeIndex].t < endTime) {
        const currentKeyframe = entity.keyframes[keyframeIndex]
        const nextKeyframe = entity.keyframes[keyframeIndex + 1]
        const nextSelected = state.derivedSelection.keyframes.includes(nextKeyframe)
        const circle = createCircle()
        const i = keyframeIndex
        circle.onclick = () => {
            useStore.getState().select({
                results: [{ id: entity.id, keyframeIndices: [i] }],
            })
        }

        circle.setAttribute("r", rem(circleSize / 2))
        circle.setAttribute("cx", (((currentKeyframe.t - beginTime) / lineDuration) * lineWidth).toString())
        circle.setAttribute("cy", rem(yPadding + lineStartY + fontSize / 2))
        circle.setAttribute("fill", currentSelected ? "aqua" : "gray")

        const rect = createRect()

        rect.onclick = () =>
            useStore.getState().select({
                results: [{ id: entity.id, keyframeIndices: [i, i + 1] }],
            })

        rect.setAttribute("fill", currentSelected && nextSelected ? "aqua" : "gray")
        rect.setAttribute("y", rem(yPadding + lineStartY + fontSize / 2 - circleSize / 2))
        rect.setAttribute(
            "x",
            (((currentKeyframe.t - beginTime) / lineDuration) * lineWidth + convertRemToPixels(circleSize)).toString()
        )

        rect.setAttribute("rx", "5")
        rect.setAttribute(
            "width",
            Math.max(
                0,
                ((nextKeyframe.t - currentKeyframe.t) / lineDuration) * lineWidth - convertRemToPixels(circleSize) * 2
            ).toString()
        )

        rect.setAttribute("height", rem(circleSize))

        keyframeIndex++
        currentSelected = nextSelected
    }
}
