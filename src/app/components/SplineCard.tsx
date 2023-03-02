import {useCallback, useContext, useEffect, useMemo, useRef} from 'preact/hooks'
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
    vchRef: RefObject<ValueChangeHandler | null>
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

export function SplineCard({coordinate, id, spline, splineTypeValueList, vchRef}: Props) {
    console.log('invoke SplineCard')
    
    const cardRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const dragRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLDivElement>(null)
    
    const splineRef = useRef<MultiPoint<number> | Constant>(spline)
    const splineTypeValueListRef = useRef<SplineTypeValue[]>(splineTypeValueList)
    
    const resizeDirectionRef = useRef<ResizeDirection>({width: 1, height: 0, posX: 0, posY: 0})
    const offsetRef = useRef<pos2n>(useContext(Offset))
    offsetRef.current = useContext(Offset)
    const posRef = useRef<pos2n>({x: 0, y: 0})
    const ctxRef = useRef<CanvasRenderingContext2D>(null)

    // Apply spline type value change handlers
    useEffect(() => {
        console.log('STVList or spline changed')
        splineRef.current = spline
        splineTypeValueListRef.current = splineTypeValueList
        if (spline instanceof MultiPoint) {
            for (const value of splineTypeValueList) {
                value.valChangeHandlerRef.current = (newVal: number) => {
                    console.log('val change received')
                    spline.values[value.index] = new Constant(newVal)
                    draw()
                    if (vchRef.current) {
                        console.log('passing val change to parent')
                        vchRef.current(sample())
                    } else console.log('vch is null, not passing change to parent')
                }
            }
        }
        draw()
    }, [splineTypeValueList, spline])

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
            if (minX == maxX){
                minX = -1
                maxX = 1
            }
        } else {
            minX = -1
            maxX = 1
        }
        return [minX, maxX]
    }, [spline])

    function sample() {
        if (!indicatorRef.current || !cardRef.current)
            return 0
        const X = cardRef.current.clientWidth - 2 * RESIZE_WIDTH
        const x = indicatorRef.current.offsetLeft + INDICATOR_WIDTH / 2
        const val = splineRef.current.compute(minX + x / X * (maxX - minX))
        console.log('sample: ', val)
        return val
    }

    // Draw curve
    function draw() {
        splineRef.current.calculateMinMax()
        if (!canvasRef.current) {
            console.error('ref to canvas is null, draw failed')
            return
        }
        if (!ctxRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d')
            if (!ctxRef.current) {
                console.error('failed to obtain 2D context, draw failed')
                return
            }
        }
        const ctx = ctxRef.current
        const spline = splineRef.current

        const width = canvasRef.current.clientWidth
        const height = canvasRef.current.clientHeight
        canvasRef.current.width = width
        canvasRef.current.height = height
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

    function move(dX: number, dY: number) {
        if (!cardRef.current)
            return
        posRef.current.x += dX
        posRef.current.y += dY
        cardRef.current.style.left = `${offsetRef.current.x + posRef.current.x}px`
        cardRef.current.style.top = `${offsetRef.current.y + posRef.current.y}px`
    }

    // TODO refer to NoisePreview to enhance dragging performance and robust
    const onDragMouseMove = useCallback((e: MouseEvent) => {
        if (!cardRef.current)
            return
        move(e.movementX, e.movementY)
    }, [])

    const onDragMouseUp = useCallback((e: MouseEvent) => {
        if (!dragRef.current)
            return
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onDragMouseMove)
        document.removeEventListener('mouseup', onDragMouseUp)
    }, [])

    const onDragMouseDown = useCallback((e: MouseEvent) => {
        if (!dragRef.current)
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
            resizeDirectionRef.current = direction
            document.addEventListener('mousemove', onResizeMouseMove)
            document.addEventListener('mouseup', onResizeMouseUp)
        }
    }, [])

    const onResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!cardRef.current)
            return
        const direction = resizeDirectionRef.current

        let newWidth = cardRef.current.clientWidth + e.movementX * direction.width
        if (newWidth >= MIN_WIDTH) {
            cardRef.current.style.width = `${newWidth}px`
            move(e.movementX * direction.posX, 0)
        }

        let newHeight = cardRef.current.clientHeight + e.movementY * direction.height
        if (newHeight >= MIN_HEIGHT) {
            cardRef.current.style.height = `${newHeight}px`
            move(0, e.movementY * direction.posY)
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
        if (!(indicatorRef.current) || !(cardRef.current)) {
            console.error('indicator or card not available')
            return
        }
        let newX = indicatorRef.current.offsetLeft + e.movementX
        if (newX >= RESIZE_WIDTH - INDICATOR_WIDTH / 2 && newX <= cardRef.current.clientWidth - RESIZE_WIDTH - INDICATOR_WIDTH / 2) {
            newX = newX / cardRef.current.clientWidth * 100
            indicatorRef.current.style.left = `${Math.round(newX)}%`
            if (vchRef.current) {
                console.log('calling vchRef')
                vchRef.current(sample())
            } else {
                console.log('vchRef is null')
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

    return <div class="spline-card" ref={cardRef} style={{
        left: `${useContext(Offset).x + posRef.current.x}px`,
        top: `${useContext(Offset).y + posRef.current.y}px`
    }}>
        <div class="spline-coord" style={{
            position: 'absolute', left: '6px', top: '25px',
            height: '15px', fontSize: '15px', backgroundColor: 'transparent', pointerEvents: 'none'
        }}>
            {`${coordinate} id: ${id}`}
        </div>
        <div class="spline-drag" ref={dragRef} onMouseDown={onDragMouseDown}>{Octicon['code']}</div>
        <div class="spline-resize" style={{gridArea: 'resize-left', cursor: 'ew-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: -1, height: 0, posX: 1, posY: 0})}
        />
        <canvas class="spline-canvas" ref={canvasRef} style={{backgroundColor: 'transparent'}}/>
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
        <div class="coord-indicator" ref={indicatorRef} onMouseDown={onIndicatorMouseDown}/>
    </div>
}
