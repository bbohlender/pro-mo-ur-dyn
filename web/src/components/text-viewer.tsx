import { FunctionComponent, HTMLProps, KeyboardEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { useStore } from "../state/store.js"
import {
    NestedDescriptions,
    ParsedDescription,
    ParsedNoun,
    ParsedTransformation,
    createDescriptionSerializeFunction,
    parse,
    serializeString,
} from "pro-3d-video"
import { PencilSquareIcon, ArrowDownIcon } from "@heroicons/react/20/solid"
import { Panel } from "./panel.js"
import shallow from "zustand/shallow"

const reactSerializer = createDescriptionSerializeFunction<FunctionComponent<any>>(
    (text, astId) => (props) => <span {...props}>{text}</span>,
    (astId, serializeTransformation, serializeNoun, serializeDescription) => {
        switch (astId[0]) {
            case "t":
                return Tranformation.bind(null, astId, serializeTransformation)
            case "n":
                return Noun.bind(null, astId, serializeNoun)
            case "d":
                return Description.bind(null, astId, serializeDescription)
            default:
                throw new Error(`unknown type of ast id "${astId}"`)
        }
    },
    (astId, fromDescriptionId, forAstId) => (props) => {
        const noun = useStore((state) => state.descriptions.nouns[astId])
        const description = useStore((state) => state.descriptions.descriptions[noun.descriptionId])
        if (noun.descriptionId === fromDescriptionId) {
            return <span {...props}>{noun.identifier}</span>
        }
        return (
            <span {...props}>
                {description.identifier}.{noun.identifier}
            </span>
        )
    },
    (...Components) =>
        (props) =>
            (
                <>
                    {Components.map((Component, index) => (
                        <Component {...props} key={index} />
                    ))}
                </>
            ),
    (_, astId) => (props) => <span {...props}> </span>
)

function Tranformation(
    astId: string,
    serializeTransformation: (transformation: ParsedTransformation, decendentsDepth: number) => FunctionComponent<any>
) {
    const transformation = useStore((state) => state.descriptions.transformations[astId])

    const Component = useMemo(() => serializeTransformation(transformation, 0), [transformation])

    const [hovered, setHovered] = useState(false)

    const selected = useStore((state) => state.derivedSelection.astIds.includes(astId))

    return (
        <div className={`inline ${selected ? "selected" : hovered ? "hovered" : ""}`}>
            <Component
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                onClick={() => useStore.getState().select({ astIds: [astId] })}
            />
        </div>
    )
}

function Noun(
    astId: string,
    serializeNoun: (
        noun: ParsedNoun,
        decendentsDepth: number
    ) => FunctionComponent<{ onClick?: (astId: string) => void }>
) {
    const noun = useStore((state) => state.descriptions.nouns[astId])

    const Component = useMemo(() => serializeNoun(noun, 0), [noun])

    return <Component />
}

function Description(
    astId: string,
    serializeDescription: (
        description: ParsedDescription,
        allNounIds: string[]
    ) => FunctionComponent<{ onClick?: (astId: string) => void }>
) {
    const description = useStore((state) => state.descriptions.descriptions[astId])
    const allNounIds = useStore(
        (state) =>
            Object.entries(state.descriptions.nouns)
                .filter(([, noun]) => noun.descriptionId === astId)
                .map(([nounId]) => nounId),
        shallow as any
    )

    const Component = useMemo(() => serializeDescription(description, allNounIds), [description, allNounIds])

    return <Component />
}

export function TextViewer() {
    const descriptionIds = useStore((state) => Object.keys(state.descriptions.descriptions), shallow as any)
    return (
        <Panel
            style={{ maxWidth: 340 }}
            className="items-end gap-3 flex justify-between flex-col text-ui relative h-full text-slate-950 bg-transparent flex-basis-0 flex-grow">
            <div className="flex-grow-1 overflow-y-auto">
                <div className="m-5">
                    {descriptionIds.map((descriptionId) => (
                        <DescriptionViewer key={descriptionId} id={descriptionId} />
                    ))}
                </div>
            </div>

            <div className="flex flex-row gap-3 p-5">
                <button
                    className="btn btn-sm p-2 aspect-square btn-primary rounded-full flex items-center"
                    onClick={downloadText}>
                    <ArrowDownIcon />
                </button>

                <button
                    className="btn btn-sm p-2 aspect-square btn-primary rounded-full flex items-center"
                    onClick={useStore.getState().beginTextEdit}>
                    <PencilSquareIcon />
                </button>
            </div>
        </Panel>
    )
}

async function downloadText() {
    const text = serializeString(useStore.getState().descriptions)

    const a = document.createElement("a")
    a.href = window.URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    a.download = `scene.cgv`
    a.click()
}

function DescriptionViewer({ id }: { id: string }) {
    const Component = useMemo(() => reactSerializer(id), [id])
    return <Component />
}
