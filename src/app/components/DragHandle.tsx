import {ComponentChildren, Ref} from "preact";

interface Props {
    class: string
    reference?: Ref<HTMLDivElement>
    onDrag: (e: MouseEvent) => unknown
    buttons?: number[]
    propagate?: boolean
    children?: ComponentChildren,
}

export function DragHandle({class: clazz, reference, onDrag, buttons, propagate, children}: Props) {

    function match(btn: number): boolean {
        if (!buttons)
            return btn == 0
        for (const b of buttons)
            if (btn == b)
                return true
        return false
    }

    function onMouseUp(e: MouseEvent) {
        if (match(e.button)) {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }

        if (!propagate)
            e.stopPropagation()
    }

    function onMouseMove(e: MouseEvent) {
        onDrag(e)
        if (!propagate)
            e.stopPropagation()
    }

    function onMouseDown(e: MouseEvent) {
        if (match(e.button)) {
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
        }
        if (!propagate)
            e.stopPropagation()
    }

    return <div class={`drag-handle${clazz ? ` ${clazz}` : ''}`} ref={reference} onMouseDown={onMouseDown}>
        {children}
    </div>
}