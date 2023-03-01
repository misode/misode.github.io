import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks'
import {Octicon} from "./Octicon.js";
import {CubicSpline} from "deepslate";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;
import {RefObject} from "preact";

interface Props {
    spline: MultiPoint<number> | Constant
    splineRef: RefObject<MultiPoint<number> | Constant>
    samplerRef: RefObject<() => number> | null
    valChangeHandlerRef: RefObject<(newVal: number) => any> | null
}

interface ResizeDirection {
    width: number
    height: number
    posX: number
    posY: number
}

const INDICATOR_WIDTH = 2
const RESIZE_WIDTH = 6

export function SplineCard({spline, splineRef, samplerRef, valChangeHandlerRef}: Props) {
    // TODO useCallback is not required on some functions
    console.log('invoke SplineCard')
    const canvas = useRef<HTMLCanvasElement>(null)
    const drag = useRef<HTMLDivElement>(null)
    const card = useRef<HTMLDivElement>(null)
    const indicator = useRef<HTMLDivElement>(null)
    const resizeDirection = useRef<ResizeDirection>({width: 1, height: 0, posX: 0, posY: 0})
    // TODO maybe not good practice
    const [ctx, setCtx] = useState<CanvasRenderingContext2D>()

    useEffect(() => {
        if (!canvas.current)
            return
        if (!ctx) {
            const ctx = canvas.current.getContext('2d')
            if (!ctx)
                return
            setCtx(ctx)
        }
    }, [])

    const [minX, maxX] = useMemo(() => {
        // TODO solve situations where all locations have same val
        // TODO in this case minX and maxX are equal, should state err or sth
        let minX: number
        let maxX: number
        if ((spline instanceof MultiPoint) && spline.locations.length > 1) {
            minX = spline.locations[0]
            maxX = spline.locations[0]
            for (const location of spline.locations) {
                if (location > maxX)
                    maxX = location
                if (location < minX)
                    minX = location
            }
        } else {
            minX = -1
            maxX = 1
        }
        return [minX, maxX]
    }, [spline])

    function sample() {
        if (!(indicator.current) || !(card.current))
            return 0

        let X = card.current.clientWidth - 2 * RESIZE_WIDTH
        let x = indicator.current.offsetLeft + INDICATOR_WIDTH / 2 - RESIZE_WIDTH
        x = minX + x * (maxX - minX) / X
        return x
    }
    if (samplerRef?.current)
        samplerRef.current = sample

    // Draw curve
    function draw() {
        spline.calculateMinMax()
        if (!canvas.current)
            return
        if (!ctx)
            return

        const width = canvas.current.clientWidth
        const height = canvas.current.clientHeight
        canvas.current.width = width
        canvas.current.height = height
        ctx.resetTransform()
        ctx.translate(width / 2, height / 2)
        ctx.scale(1, -1)

        ctx.clearRect(-width / 2, -height / 2, width, height)
        ctx.beginPath()
        const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))
        ctx.strokeStyle = "rgb(154,154,154)"
        ctx.moveTo(-width / 2, spline.compute(minX) * (height / 2) / maxAbs)
        for (let i = 1; i <= 100; i++) {
            let x = -width / 2 + width / 100 * i
            let y = spline.compute(minX + (maxX - minX) / 100 * i) * (height / 2) / maxAbs
            ctx.lineTo(x, y)
        }
        ctx.stroke()
    }

    useEffect(draw, [spline])
    useEffect(() => {
        splineRef.current = spline
    }, [spline])

    // TODO refer to NoisePreview to enhance dragging performance and robust
    const onDragMouseMove = useCallback((e: MouseEvent) => {
        if (!card.current)
            return
        card.current.style.left = `${card.current.offsetLeft + e.movementX}px`
        card.current.style.top = `${card.current.offsetTop + e.movementY}px`
    }, [])

    const onDragMouseUp = useCallback((e: MouseEvent) => {
        if (!drag.current)
            return
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onDragMouseMove)
        document.removeEventListener('mouseup', onDragMouseUp)
    }, [])

    const onDragMouseDown = useCallback((e: MouseEvent) => {
        if (!drag.current)
            return
        if (e.button != 0)
            return
        document.addEventListener('mousemove', onDragMouseMove)
        document.addEventListener('mouseup', onDragMouseUp)
    }, [])

    const buildResizeMouseDownHandler = useCallback((direction: ResizeDirection) => {
        return (e: MouseEvent) => {
            if (e.button != 0)
                return
            resizeDirection.current = direction
            document.addEventListener('mousemove', onResizeMouseMove)
            document.addEventListener('mouseup', onResizeMouseUp)
        }
    }, [])

    const onResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!card.current)
            return
        const direction = resizeDirection.current
        card.current.style.width = `${card.current.clientWidth + e.movementX * direction.width}px`
        card.current.style.height = `${card.current.clientHeight + e.movementY * direction.height}px`
        card.current.style.left = `${card.current.offsetLeft + e.movementX * direction.posX}px`
        card.current.style.top = `${card.current.offsetTop + e.movementY * direction.posY}px`
        draw()
    }, [])

    const onResizeMouseUp = useCallback((e: MouseEvent) => {
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onResizeMouseMove)
        document.removeEventListener('mousemove', onResizeMouseUp)
    }, [])

    function onIndicatorMouseMove(e: MouseEvent) {
        if (!(indicator.current) || !(card.current))
            return
        let newX = indicator.current.offsetLeft + e.movementX
        if (newX >= RESIZE_WIDTH - INDICATOR_WIDTH / 2 && newX <= card.current.clientWidth - RESIZE_WIDTH - INDICATOR_WIDTH / 2) {
            indicator.current.style.left = `${newX}px`
            if(valChangeHandlerRef && valChangeHandlerRef?.current){
                valChangeHandlerRef.current(sample())
            }
        }
    }

    function onIndicatorMouseUp(e: MouseEvent) {
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onIndicatorMouseMove)
        document.removeEventListener('mouseup', onIndicatorMouseUp)
    }

    const onIndicatorMouseDown = useCallback((e: MouseEvent) => {
        if (e.button != 0)
            return
        document.addEventListener('mousemove', onIndicatorMouseMove)
        document.addEventListener('mouseup', onIndicatorMouseUp)
    }, [])

    return <div class="spline-card" ref={card}>
        <div class="spline-drag" ref={drag} onMouseDown={onDragMouseDown}>{Octicon['code']}</div>
        <div class="spline-resize" style={{gridArea: 'resize-left', cursor: 'ew-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: -1, height: 0, posX: 1, posY: 0})}
        />
        <canvas class="spline-canvas" ref={canvas} style={{backgroundColor: 'transparent'}}/>
        <div class="spline-resize" style={{gridArea: 'resize-right', cursor: 'ew-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: 1, height: 0, posX: 0, posY: 0})}
        />
        <div class="spline-resize" style={{gridArea: 'resize-corner-left', cursor: 'nesw-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: -1, height: 1, posX: 1, posY: 0})}
        />
        <div class="spline-resize" style={{gridArea: 'resize-bottom', cursor: 'ns-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: 0, height: 1, posX: 0, posY: 0})}
        />
        <div class="spline-resize" style={{gridArea: 'resize-corner-right', cursor: 'nwse-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: 1, height: 1, posX: 0, posY: 0})}
        />
        <div class="coord-indicator" ref={indicator} onMouseDown={onIndicatorMouseDown}/>
    </div>
}
