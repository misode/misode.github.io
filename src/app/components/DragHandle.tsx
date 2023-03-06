import {ComponentChildren, Ref} from "preact";

interface Props {
    class: string
    reference?: Ref<HTMLDivElement>
    onDrag: (e: MouseEvent) => unknown
    btn?: number
    propagate?: boolean
    children?: ComponentChildren,
}

export function DragHandle({class: clazz, reference, onDrag, btn, propagate, children}: Props) {

    function onMouseUp(e: MouseEvent) {
        if(!btn || (btn && e.button & btn)) {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
        if(!propagate)
            e.stopPropagation()
    }

    function onMouseMove(e: MouseEvent) {
        onDrag(e)
        if(!propagate)
            e.stopPropagation()
    }

    function onMouseDown(e: MouseEvent) {
        if(!btn || (btn && e.button & btn)) {
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
        }
        if(!propagate)
            e.stopPropagation()
    }

    return <div class={`drag-handle${clazz ? ` ${clazz}` : ''}`} ref={reference} onMouseDown={onMouseDown}>
        {children}
    </div>
}