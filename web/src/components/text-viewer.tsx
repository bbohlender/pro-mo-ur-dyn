import { FunctionComponent, HTMLProps, KeyboardEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { useStore } from "../state/store.js"
import {
    NestedDescriptions,
    ParsedDescription,
    ParsedNoun,
    ParsedTransformation,createDescriptionSerializeFunction,
    parse,
    serializeString,
} from "pro-3d-video"
import { PencilSquareIcon, ExclamationCircleIcon, ArrowDownIcon } from "@heroicons/react/20/solid"
import { Panel } from "./panel.js"
import shallow from "zustand/shallow"

const reactSerializer = createDescriptionSerializeFunction<FunctionComponent>(
    (text, astId) => () => <span>{text}</span>,
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
    (astId, fromDescriptionId, forAstId) => () => {
        const noun = useStore((state) => state.descriptions.nouns[astId])
        const description = useStore((state) => state.descriptions.descriptions[noun.descriptionId])
        if (noun.descriptionId === fromDescriptionId) {
            return <span>{noun.identifier}</span>
        }
        return (
            <span>
                {description.identifier}.{noun.identifier}
            </span>
        )
    },
    (...Components) =>
        () =>
            (
                <>
                    {Components.map((Component, index) => (
                        <Component key={index} />
                    ))}
                </>
            ),
    (_, astId) => () => <span> </span>
)

function Tranformation(
    astId: string,
    serializeTransformation: (transformation: ParsedTransformation, decendentsDepth: number) => FunctionComponent
) {
    const transformation = useStore((state) => state.descriptions.transformations[astId])

    const Component = useMemo(() => serializeTransformation(transformation, 0), [transformation])

    return <Component />
}

function Noun(astId: string, serializeNoun: (noun: ParsedNoun, decendentsDepth: number) => FunctionComponent) {
    const noun = useStore((state) => state.descriptions.nouns[astId])

    const Component = useMemo(() => serializeNoun(noun, 0), [noun])

    return <Component />
}

function Description(
    astId: string,
    serializeDescription: (description: ParsedDescription, allNounIds: string[]) => FunctionComponent
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
            className="items-end gap-3 flex justify-between flex-col text-ui relative p-5 h-full text-slate-950 bg-transparent flex-basis-0 flex-grow">
            <div className="flex-grow-1 overflow-y-auto">
                {descriptionIds.map((descriptionId) => (
                    <DescriptionViewer key={descriptionId} id={descriptionId} />
                ))}
            </div>

            <div className="flex flex-row gap-3">
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
