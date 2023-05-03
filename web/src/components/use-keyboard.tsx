import { useEffect } from "react"
import { useStore } from "../state/store.js"

export function useKeyboard() {
    useEffect(() => {
        const keyUpListener = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Shift":
                case "Control":
                    useStore.getState().shift = false
                    break
            }
        }
        const keyDownListener = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    if (e.target == document.body) {
                        useStore.getState().unselect()
                    }
                    break
                case "Delete":
                    if (e.target == document.body) {
                        useStore.getState().delete()
                    }
                    break
                case "Shift":
                case "Control":
                    useStore.getState().shift = true
                    break
            }
        }
        window.addEventListener("keydown", keyDownListener)
        window.addEventListener("keyup", keyUpListener)
        return () => {
            window.removeEventListener("keydown", keyDownListener)
            window.removeEventListener("keyup", keyUpListener)
        }
    }, [])
}
