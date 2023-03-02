import {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'preact/hooks'
import {Octicon} from "./Octicon.js";
import {CubicSpline} from "deepslate";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;
import {RefObject} from "preact";
import {pos2n} from "../Utils.js";
import {Offset} from "./previews/SplinePreview.js";

export type ValueChangeHandler = (newVal: number) => any

export type SplineTypeValue = {
    index: number
    valChangeHandlerRef: RefObject<ValueChangeHandler>
}

export type Sampler = () => number

interface Props {
    id: number
    coordinate: string | number | bigint
    spline: MultiPoint<number> | Constant
    splineTypeValueList: SplineTypeValue[]
    valChangeHandlerRef: RefObject<ValueChangeHandler> | null
}

interface ResizeDirection {
    width: number
    height: number
    posX: number
    posY: number
}

const INDICATOR_WIDTH = 2
const RESIZE_WIDTH = 6
const MIN_WIDTH = 112
const MIN_HEIGHT = 81

export function SplineCard({coordinate, id, spline, splineTypeValueList, valChangeHandlerRef}: Props) {
    // TODO useCallback is not required on some functions
    console.log('invoke SplineCard')
    const canvas = useRef<HTMLCanvasElement>(null)
    const drag = useRef<HTMLDivElement>(null)
    const card = useRef<HTMLDivElement>(null)
    const indicator = useRef<HTMLDivElement>(null)
    const resizeDirection = useRef<ResizeDirection>({width: 1, height: 0, posX: 0, posY: 0})
    const offset = useRef<pos2n>(useContext(Offset))
    offset.current = useContext(Offset)
    const pos = useRef<pos2n>({x: 0, y: 0})
    // TODO maybe not good practice
    const ctxRef = useRef<CanvasRenderingContext2D>(null)

    // Apply spline type value change handlers
    useEffect(function applyVCHList() {
        if (spline instanceof MultiPoint) {
            console.log('applying value change handler list', splineTypeValueList)
            for (const value of splineTypeValueList) {
                console.log(value.valChangeHandlerRef.current ? 'ref not null' : 'ref is null')
                value.valChangeHandlerRef.current = (newVal: number) => {
                    console.log('invoke val change handler, old val:', spline.values[value.index], 'new:', newVal)
                    spline.values[value.index] = new Constant(newVal)
                    draw()
                    // TODO maybe this one has no effect
                    if (valChangeHandlerRef && valChangeHandlerRef.current)
                        valChangeHandlerRef.current(sample())
                }
            }
        }
    }, [valChangeHandlerRef, spline])

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
        if (!indicator.current || !card.current)
            return 0
        const X = card.current.clientWidth - 2 * RESIZE_WIDTH
        const x = indicator.current.offsetLeft + INDICATOR_WIDTH / 2
        const val = spline.compute(minX + x / X * (maxX - minX))
        console.log('sample: ', val)
        return val
    }

    // Draw curve
    function draw() {
        spline.calculateMinMax()
        if (!canvas.current) {
            console.error('ref to canvas is null, draw failed')
            return
        }
        if (!ctxRef.current) {
            const ctx = canvas.current.getContext('2d')
            if (ctx) {
                ctxRef.current = ctx
            } else {
                console.error('failed to obtain 2D context, draw failed')
            }
        }
        const ctx = ctxRef.current

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

    function move(dX: number, dY: number) {
        if (!card.current)
            return
        pos.current.x += dX
        pos.current.y += dY
        card.current.style.left = `${offset.current.x + pos.current.x}px`
        card.current.style.top = `${offset.current.y + pos.current.y}px`
    }

    // TODO refer to NoisePreview to enhance dragging performance and robust
    const onDragMouseMove = useCallback((e: MouseEvent) => {
        if (!card.current)
            return
        move(e.movementX, e.movementY)
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
        e.stopPropagation()
        document.addEventListener('mousemove', onDragMouseMove)
        document.addEventListener('mouseup', onDragMouseUp)
    }, [])

    const buildResizeMouseDownHandler = useCallback((direction: ResizeDirection) => {
        return (e: MouseEvent) => {
            if (e.button != 0)
                return
            e.stopPropagation()
            resizeDirection.current = direction
            document.addEventListener('mousemove', onResizeMouseMove)
            document.addEventListener('mouseup', onResizeMouseUp)
        }
    }, [])

    const onResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!card.current)
            return
        const direction = resizeDirection.current

        let newWidth = card.current.clientWidth + e.movementX * direction.width
        if (newWidth >= MIN_WIDTH) {
            card.current.style.width = `${newWidth}px`
            move(e.movementX, 0)
        }

        let newHeight = card.current.clientHeight + e.movementY * direction.height
        if (newHeight >= MIN_HEIGHT) {
            card.current.style.height = `${newHeight}px`
            move(0, e.movementY)
        }
        draw()
    }, [])

    const onResizeMouseUp = useCallback((e: MouseEvent) => {
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onResizeMouseMove)
        document.removeEventListener('mousemove', onResizeMouseUp)
    }, [])

    function onIndicatorMouseMove(e: MouseEvent) {
        if (!(indicator.current) || !(card.current)) {
            console.error('indicator or card not available')
            return
        }
        let newX = indicator.current.offsetLeft + e.movementX
        if (newX >= RESIZE_WIDTH - INDICATOR_WIDTH / 2 && newX <= card.current.clientWidth - RESIZE_WIDTH - INDICATOR_WIDTH / 2) {
            newX = newX / card.current.clientWidth * 100
            indicator.current.style.left = `${Math.round(newX)}%`
            if (valChangeHandlerRef && valChangeHandlerRef.current) {
                valChangeHandlerRef.current(sample())
            } else {
                console.log('id:', id, 'indicator moved but VCH Ref is', valChangeHandlerRef)
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
        e.stopPropagation()
        document.addEventListener('mousemove', onIndicatorMouseMove)
        document.addEventListener('mouseup', onIndicatorMouseUp)
    }, [])

    return <div class="spline-card" ref={card} style={{
        left: `${useContext(Offset).x + pos.current.x}px`,
        top: `${useContext(Offset).y + pos.current.y}px`
    }}>
        <div class="spline-coord" style={{
            position: 'absolute', left: '6px', top: '25px',
            height: '15px', fontSize: '15px', backgroundColor: 'transparent', pointerEvents: 'none'
        }}>
            {`${coordinate} id: ${id}`}
        </div>
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
