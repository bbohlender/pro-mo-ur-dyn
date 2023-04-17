import { HTMLProps } from "react"

export function Panel({ children, className, ...rest }: HTMLProps<HTMLDivElement>) {
    return (
        <div {...rest} className={`pointer-events-auto relative border rounded-3xl overflow-hidden shadow-sm ${className}`}>
            <div className="absolute -z-10 inset-0 backdrop-blur" />
            {children}
        </div>
    )
}
