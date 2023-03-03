import {StateUpdater, useCallback, useContext, useEffect, useMemo, useRef} from 'preact/hooks'
import {Octicon} from "./Octicon.js";
import {CubicSpline} from "deepslate";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;
import {pos2n} from "../Utils.js";
import {Focused, Offset} from "./previews/SplinePreview.js";

export type ValueChangeHandler = (newVal: number) => any

export type CardLink = {
    valIndex: number
    color: string
    handleValueChange: ValueChangeHandler | null
}

interface Props {
    coordinate: string | number | bigint
    spline: MultiPoint<number> | Constant
    inputLinkList: CardLink[]
    outputLink: CardLink | null
    placePos: pos2n
    setFocused: StateUpdater<string[]>
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

// Class for simple transformation, translation and scale only
class Transformation {
    offsetX = 0
    offsetY = 0
    scaleX = 1
    scaleY = 1

    constructor() {
    }

    transform(x: number, y: number): { x: number, y: number } {
        const xx = this.offsetX + this.scaleX * x
        const yy = this.offsetY + this.scaleY * y
        return {x: xx, y: yy}
    }

    x(x: number): number {
        return this.offsetX + this.scaleX * x
    }

    y(y: number): number {
        return this.offsetY + this.scaleY * y
    }
}

export function SplineCard({
                               coordinate,
                               spline,
                               inputLinkList,
                               outputLink,
                               placePos = {x: 0, y: 0},
                               setFocused
                           }: Props) {
    console.log('invoke SplineCard')

    const cardRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const dragRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLDivElement>(null)

    const splineRef = useRef<MultiPoint<number> | Constant>(spline)
    const inputLinkListRef = useRef<CardLink[]>(inputLinkList)
    const outputLinkRef = useRef<CardLink>(outputLink)

    const resizeDirectionRef = useRef<ResizeDirection>({width: 1, height: 0, posX: 0, posY: 0})
    const offsetRef = useRef<pos2n>(useContext(Offset))
    offsetRef.current = useContext(Offset)
    const posRef = useRef<pos2n>(placePos)
    const ctxRef = useRef<CanvasRenderingContext2D>(null)

    useEffect(() => {
        outputLinkRef.current = outputLink
    }, [outputLink])
    // Apply spline type value change handlers
    useEffect(() => {
        console.log('STVList or spline changed')
        splineRef.current = spline
        inputLinkListRef.current = inputLinkList
        if (spline instanceof MultiPoint) {
            for (const link of inputLinkList) {
                link.handleValueChange = (newVal: number) => {
                    console.log('val change received')
                    spline.values[link.valIndex] = new Constant(newVal)
                    draw()
                    if (outputLinkRef.current?.handleValueChange) {
                        console.log('passing val change to parent')
                        outputLinkRef.current.handleValueChange(sample())
                    } else console.log('vch is null, not passing change to parent')
                }
            }
        }
        draw()
    }, [inputLinkList, spline])
    useEffect(() => {
        posRef.current = placePos
    }, [placePos])

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
            if (minX == maxX) {
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
        const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))

        const t = new Transformation()
        t.offsetX = -minX * width / (maxX - minX)
        t.offsetY = height / 2
        t.scaleX = width / (maxX - minX)
        t.scaleY = -height / 2 / maxAbs

        if (spline instanceof Constant) {
            ctx.beginPath()
            ctx.moveTo(t.x(minX), t.y(0))
            ctx.lineTo(t.x(maxX), t.y(0))
            ctx.stroke()
            return
        }
        ctx.clearRect(0, 0, width, height)
        ctx.beginPath()
        ctx.strokeStyle = "rgb(154,154,154)"
        ctx.moveTo(t.x(minX), t.y(spline.compute(minX)))
        for (let i = 1; i <= 100; i++) {
            let x = t.x(minX + (maxX - minX) * i / 100)
            let y = t.y(spline.compute(minX + (maxX - minX) * i / 100))
            ctx.lineTo(x, y)
        }
        ctx.stroke()

        let length = Math.min(50, height / 3)
        console.log('length: ', length)
        console.log('maxAbs', maxAbs)
        for (const link of inputLinkListRef.current) {
            ctx.strokeStyle = link.color
            ctx.beginPath()
            let x = spline.locations[link.valIndex]
            let midY = t.y(spline.compute(x))
            x = t.x(x)
            const y1 = midY - length / 2
            const y2 = midY + length / 2
            ctx.moveTo(x, y1)
            ctx.lineTo(x, y2)
            ctx.stroke()
        }
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

        const rect = cardRef.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        let newWidth = width + e.movementX * direction.width
        if (newWidth >= MIN_WIDTH) {
            cardRef.current.style.width = `${newWidth}px`
            move(e.movementX * direction.posX, 0)
        }

        let newHeight = height + e.movementY * direction.height
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
            indicatorRef.current.style.left = `${newX}%`
            if (outputLinkRef.current?.handleValueChange) {
                console.log('calling vchRef')
                outputLinkRef.current?.handleValueChange(sample())
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

    function onIndicatorMouseDown(e: MouseEvent) {
        if (e.button != 0)
            return
        e.stopPropagation()
        document.addEventListener('mousemove', onIndicatorMouseMove)
        document.addEventListener('mouseup', onIndicatorMouseUp)
    }

    function onCanvasHover(e: MouseEvent) {
        if (!canvasRef.current || !splineRef.current)
            return
        const spline = splineRef.current
        const width = canvasRef.current.clientWidth
        const t = new Transformation()
        t.offsetX = minX
        t.scaleX = (maxX - minX) / width
        const x = t.x(e.offsetX)
        const y = spline.compute(x)
        setFocused([`x:${x.toPrecision(3)}`, `y:${y.toPrecision(3)}`])
    }

    function onIndicatorHover(e: MouseEvent) {
        if (!canvasRef.current || !splineRef.current || !indicatorRef.current)
            return
        e.stopPropagation()
        const spline = splineRef.current
        const width = canvasRef.current.clientWidth
        const t = new Transformation()
        t.offsetX = minX
        t.scaleX = (maxX - minX) / width
        const x = t.x(indicatorRef.current.offsetLeft + INDICATOR_WIDTH / 2 - RESIZE_WIDTH)
        const y = spline.compute(x)
        setFocused([`x:${x.toPrecision(3)}`, `y:${y.toPrecision(3)}`])
    }

    function onMouseLeave() {
        setFocused([])
    }

    return <div class="spline-card" ref={cardRef} style={{
        left: `${useContext(Offset).x + posRef.current.x}px`,
        top: `${useContext(Offset).y + posRef.current.y}px`,
        border: `${outputLinkRef.current?.color ? (`2px solid ${outputLinkRef.current.color}`) : 'unset'}`
    }}>
        <div class="spline-coord" style={{
            position: 'absolute', left: '6px', top: '25px',
            fontSize: '15px', backgroundColor: 'transparent', pointerEvents: 'none'
        }}>
            {`${coordinate}`}
        </div>
        <div class="spline-drag" ref={dragRef} onMouseDown={onDragMouseDown}>{Octicon['code']}</div>
        <div class="spline-resize" style={{gridArea: 'resize-left', cursor: 'ew-resize'}}
             onMouseDown={buildResizeMouseDownHandler({width: -1, height: 0, posX: 1, posY: 0})}
        />
        <canvas class="spline-canvas" ref={canvasRef} style={{backgroundColor: 'transparent'}}
                onMouseMove={onCanvasHover} onMouseLeave={onMouseLeave}/>
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
        <div class="coord-indicator" ref={indicatorRef} onMouseDown={onIndicatorMouseDown}
             onMouseMove={onIndicatorHover} onMouseLeave={onMouseLeave}/>
    </div>
}
