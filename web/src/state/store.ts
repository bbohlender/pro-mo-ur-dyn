import {} from "zustand"
import { ParsedDescriptions, parse, flattenAST } from "pro-3d-video"
import create from "zustand"
import { combine } from "zustand/middleware"

export type AppState = {
    descriptions: ParsedDescriptions
    textDescriptions: string | undefined
}

const initialDescription = ``

const initialState: AppState = {
    textDescriptions: initialDescription,
    descriptions: flattenAST(parse(initialDescription)),
}

export const useStore = create.default(combine(initialState, (set, get) => ({
    updateTextDescriptions(text: string): void {
        
    }
})))
