export function filterNull<T>(val: T | null | undefined): val is T {
    return val != null
}
