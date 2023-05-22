import { HTMLProps, KeyboardEvent, useEffect, useMemo, useState } from "react"
import { useStore } from "../state/store.js"
import { NestedDescriptions, parse, serializeDescriptionString, serializeString } from "pro-3d-video"
import { CheckIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid"
import { Panel } from "./panel.js"

export function TextEditor({ descriptionId }: { descriptionId: string }) {
    const [text, setText] = useState("")

    useEffect(() => {
        setText(serializeDescriptionString(useStore.getState().descriptions, descriptionId))
    }, [descriptionId])

    useEffect(() => {
        useStore.subscribe((state, prevState) => {
            if (state.descriptions != prevState.descriptions) {
                //TODO: set text
            }
        })
    }, [])

    const parseResult = useMemo<{ result: NestedDescriptions } | { error: string }>(() => {
        try {
            return { result: parse(text) }
        } catch (error: any) {
            return { error: error.message }
        }
    }, [text])

    return (
        <>
            <textarea
                autoFocus
                style={{ resize: "none", outline: 0, tabSize: 2 }}
                value={text}
                spellCheck={false}
                onKeyDown={(e) => onKeyDown(e, setText)}
                onChange={(e) => setText(e.target.value)}
                className="text-slate-950 w-full m-3 bg-transparent border-0 flex-basis-0 flex-grow"
            />
            {"error" in parseResult ? (
                <ErrorMessage align="right" className="absolute bottom-5 left-5 right-5" message={parseResult.error} />
            ) : (
                <button
                    className="btn btn-sm p-2 aspect-square btn-primary rounded-full flex items-center absolute right-3 bottom-3"
                    onClick={() => useStore.getState().finishTextEdit(parseResult.result, descriptionId)}>
                    <CheckIcon />
                </button>
            )}
        </>
    )
}

function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, setText: (text: string) => void) {
    if (e.code === "Tab") {
        e.preventDefault()
        // tab was pressed

        // get caret position/selection
        const val = e.currentTarget.value,
            start = e.currentTarget.selectionStart,
            end = e.currentTarget.selectionEnd

        // set textarea value to: text before caret + tab + text after caret
        setText(val.substring(0, start) + "\t" + val.substring(end))

        // put caret at right position again
        //e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1

        // prevent the focus lose
        return false
    }
}

export function ErrorMessage({
    align,
    message,
    className,
    ...rest
}: HTMLProps<HTMLDivElement> & { align: "right" | "left"; message: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            {...rest}
            className={`${className} flex justify-end flex-column ${align === "left" ? "items-start" : "items-end"}`}>
            {open && (
                <div
                    style={{
                        overflowY: "auto",
                        fontSize: "0.8rem",
                        overflowX: "hidden",
                        maxWidth: "19rem",
                        maxHeight: "8rem",
                        whiteSpace: "pre-line",
                        wordWrap: "break-word",
                        bottom: "2rem",
                    }}
                    className="rounded absolute mb-2 p-2 bg-error text-slate-50">
                    {message}
                </div>
            )}
            <div
                onClick={() => setOpen((open) => !open)}
                className="btn btn-sm p-2 aspect-square btn-error rounded-full flex items-center">
                <ExclamationCircleIcon />
            </div>
        </div>
    )
}
