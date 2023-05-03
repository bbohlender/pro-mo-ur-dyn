import { HTMLProps, forwardRef } from "react"

export const Panel = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
    ({ children, style, className, ...rest }, ref) => {
        return (
            <div
                {...rest}
                ref={ref}
                style={{ ...style, background: "rgba(255, 255, 255, 0.8)" }}
                className={`pointer-events-auto relative border rounded-3xl overflow-hidden shadow-sm ${className}`}>
                <div className="absolute -z-10 inset-0 backdrop-blur-lg" />
                {children}
            </div>
        )
    }
)
