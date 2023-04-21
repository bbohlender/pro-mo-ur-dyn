import { HTMLProps, KeyboardEvent, useEffect, useMemo, useState } from "react"
import { useStore } from "../state/store.js"
import { NestedDescriptions, parse } from "pro-3d-video"
import { PencilSquareIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid"
import { Panel } from "./panel.js"

export function TextEditor() {
    const [text, setText] = useState("")

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
        <Panel className="flex relative p-3">
            <textarea
                autoFocus
                style={{ width: 260, resize: "none", outline: 0, tabSize: 2 }}
                value={text}
                spellCheck={false}
                onKeyDown={(e) => onKeyDown(e, setText)}
                onChange={(e) => setText(e.target.value)}
                className="text-slate-950 bg-transparent p-3 border-0 flex-basis-0 flex-grow"
            />
            {"error" in parseResult ? (
                <ErrorMessage
                    style={{ position: "absolute", bottom: "1rem", left: "1rem", right: "1rem" }}
                    align="right"
                    message={parseResult.error}
                />
            ) : (
                <button
                    className="btn p-2 aspect-square btn-primary rounded-full flex items-center"
                    style={{ position: "absolute", right: "1rem", bottom: "1rem" }}
                    onClick={() => useStore.getState().replaceDescriptions(parseResult.result)}>
                    <PencilSquareIcon />
                </button>
            )}
        </Panel>
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
                        maxWidth: "20rem",
                        maxHeight: "8rem",
                        whiteSpace: "pre-line",
                        wordWrap: "break-word",
                        bottom: 52,
                    }}
                    className="rounded absolute mb-2 p-2 bg-error text-slate-50">
                    {message}
                </div>
            )}
            <div
                onClick={() => setOpen((open) => !open)}
                className="btn p-2 aspect-square btn-error rounded-full flex items-center">
                <ExclamationCircleIcon />
            </div>
        </div>
    )
}
