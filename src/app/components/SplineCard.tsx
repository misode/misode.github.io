import {StateUpdater, useContext, useEffect, useRef} from 'preact/hooks'
import {Octicon} from "./index.js";
import {CubicSpline} from "deepslate";
import {clamp, pos2n} from "../Utils.js";
import {
    Coordinate,
    CoordinateListener,
    genCardLinkColor,
    Manager,
    Offset, PosResetCnt,
    ShowCoordName
} from "./previews/SplinePreview.js";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;

export type ValueChangeHandler = (newVal: number) => any

export type CardLink = {
    valIndex: number
    color: string
    handleValueChange: ValueChangeHandler | null
    handleColorChange: (() => any) | null
}

interface Props {
    coordinate: Coordinate | number
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

// TODO Determine supported version
export function SplineCard({
                               coordinate,
                               spline,
                               inputLinkList,
                               outputLink,
                               placePos = {x: 0, y: 0},
                               setFocused
                           }: Props) {
    const card = useRef<HTMLDivElement>(null)
    const canvas = useRef<HTMLCanvasElement>(null)
    const drag = useRef<HTMLDivElement>(null)
    const indicator = useRef<HTMLDivElement>(null)

    const resizeDirection = useRef<ResizeDirection>({width: 1, height: 0, posX: 0, posY: 0})
    const offset = useRef<pos2n>(useContext(Offset))
    offset.current = useContext(Offset)
    const pos = useRef<pos2n>({x: placePos.x, y: placePos.y})
    const ctxRef = useRef<CanvasRenderingContext2D>(null)
    const lastCoord = useRef<Coordinate | number | null>(null)
    const lastCoordListener = useRef<CoordinateListener | null>(null)
    const manager = useRef(useContext(Manager))

    // Apply spline type value change handlers
    useEffect(() => {
        if (spline instanceof MultiPoint) {
            for (const link of inputLinkList) {
                link.handleValueChange = (newVal: number) => {
                    spline.values[link.valIndex] = new Constant(newVal)
                    draw()
                    if (outputLink?.handleValueChange)
                        outputLink.handleValueChange(sample())
                }
                link.handleColorChange = () => {
                    draw()
                }
            }
        }
        draw()
    }, [inputLinkList, spline, outputLink])

    // TODO solve prob
    function onCoordChange(redraw: boolean) {
        if (indicator.current && card.current) {
            let newX: number
            const width = card.current.clientWidth
            if (typeof coordinate == 'number' || coordinate.min() == coordinate.max()) {
                newX = (width / 2 - INDICATOR_WIDTH / 2) / width
            } else {
                newX = (coordinate.val() - coordinate.min()) / (coordinate.max() - coordinate.min())
                newX *= width - 2 * RESIZE_WIDTH
                newX += RESIZE_WIDTH - INDICATOR_WIDTH / 2
                newX /= width
            }
            indicator.current.style.left = `${newX * 100}%`
        }
        if (spline instanceof MultiPoint && coordinate instanceof Coordinate) {
            spline.coordinate = coordinate.toExtractor()();
        }
        if (outputLink?.handleValueChange) {
            outputLink.handleValueChange(sample())
        }
        if (redraw)
            draw()
    }

    useEffect(() => {
        if (lastCoord.current instanceof Coordinate && lastCoordListener.current)
            manager.current.removeListener(lastCoord.current.name, lastCoordListener.current)
        if (coordinate instanceof Coordinate) {
            manager.current.addListener(coordinate.name, onCoordChange)
            lastCoordListener.current = onCoordChange
        } else
            lastCoordListener.current = null
        lastCoord.current = coordinate
        onCoordChange(true)
    }, [spline, coordinate, outputLink])

    const lastPosResetCnt = useRef(useContext(PosResetCnt))
    if(useContext(PosResetCnt) != lastPosResetCnt.current) {
        pos.current.x = placePos.x
        pos.current.y = placePos.y
        lastPosResetCnt.current = useContext(PosResetCnt)
    }

    function sample() {
        if (!indicator.current || !card.current)
            return 0
        if (typeof coordinate == 'number')
            return spline.compute(coordinate)
        const X = card.current.clientWidth - 2 * RESIZE_WIDTH
        const x = indicator.current.offsetLeft + INDICATOR_WIDTH / 2
        return spline.compute(coordinate.min() + x / X * (coordinate.max() - coordinate.min()))
    }

    // Draw curve
    function draw() {
        spline.calculateMinMax()
        if (!canvas.current)
            return
        if (!ctxRef.current) {
            ctxRef.current = canvas.current.getContext('2d')
            if (!ctxRef.current)
                return
        }
        const ctx = ctxRef.current

        const width = canvas.current.clientWidth
        const height = canvas.current.clientHeight
        canvas.current.width = width
        canvas.current.height = height
        ctx.strokeStyle = "rgb(154,154,154)"
        const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))

        if (spline instanceof Constant || typeof coordinate == 'number') {
            ctx.beginPath()
            ctx.moveTo(0, height / 2)
            ctx.lineTo(width, height / 2)
            ctx.stroke()
            return
        }

        const t = new Transformation()
        t.offsetX = -coordinate.min() * width / (coordinate.max() - coordinate.min())
        t.offsetY = height / 2
        t.scaleX = width / (coordinate.max() - coordinate.min())
        t.scaleY = -height / 2 / maxAbs

        ctx.clearRect(0, 0, width, height)
        ctx.beginPath()
        ctx.moveTo(t.x(coordinate.min()), t.y(spline.compute(coordinate.min())))
        for (let i = 1; i <= 100; i++) {
            let x = t.x(coordinate.min() + (coordinate.max() - coordinate.min()) * i / 100)
            let y = t.y(spline.compute(coordinate.min() + (coordinate.max() - coordinate.min()) * i / 100))
            ctx.lineTo(x, y)
        }
        ctx.stroke()

        let length = Math.min(30, height / 4)
        for (const link of inputLinkList) {
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
        if (!card.current)
            return
        pos.current.x += dX
        pos.current.y += dY
        card.current.style.left = `${offset.current.x + pos.current.x}px`
        card.current.style.top = `${offset.current.y + pos.current.y}px`
    }

    // TODO refer to NoisePreview to enhance dragging performance and robust
    function onDragMouseMove(e: MouseEvent) {
        if (!card.current)
            return
        move(e.movementX, e.movementY)
    }

    function onDragMouseUp(e: MouseEvent) {
        if (!drag.current)
            return
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onDragMouseMove)
        document.removeEventListener('mouseup', onDragMouseUp)
    }

    function onDragMouseDown(e: MouseEvent) {
        if (!drag.current)
            return
        if (e.button != 0)
            return
        e.stopPropagation()
        document.addEventListener('mousemove', onDragMouseMove)
        document.addEventListener('mouseup', onDragMouseUp)
    }

    function buildResizeMouseDownHandler(direction: ResizeDirection) {
        return (e: MouseEvent) => {
            if (e.button != 0)
                return
            e.stopPropagation()
            resizeDirection.current = direction
            document.addEventListener('mousemove', onResizeMouseMove)
            document.addEventListener('mouseup', onResizeMouseUp)
        }
    }

    function onResizeMouseMove(e: MouseEvent) {
        if (!card.current)
            return
        const direction = resizeDirection.current

        const width = card.current.clientWidth
        const height = card.current.clientHeight
        let dW = e.movementX * direction.width
        dW = clamp(width + dW, MIN_WIDTH, Infinity) - width
        card.current.style.width = `${width + dW}px`
        let dX = Math.abs(dW) * Math.sign(e.movementX)
        move(dX * direction.posX, 0)

        let dH = e.movementY * direction.height
        dH = clamp(height + dH, MIN_HEIGHT, Infinity) - height
        card.current.style.height = `${height + dH}px`
        let dY = Math.abs(dH) * Math.sign(e.movementY)
        move(0, dY * direction.posY)
        draw()
    }

    function onResizeMouseUp(e: MouseEvent) {
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onResizeMouseMove)
        document.removeEventListener('mousemove', onResizeMouseUp)
    }

    function onIndicatorMouseMove(e: MouseEvent) {
        e.stopPropagation()
        if (!(indicator.current) || !(card.current) || typeof coordinate == 'number') {
            return
        }
        const width = card.current.clientWidth - 2 * RESIZE_WIDTH
        let newVal = indicator.current.offsetLeft + e.movementX
        newVal = clamp(newVal, RESIZE_WIDTH - INDICATOR_WIDTH / 2, width + RESIZE_WIDTH - INDICATOR_WIDTH / 2)
        newVal += INDICATOR_WIDTH / 2 - RESIZE_WIDTH
        newVal = coordinate.min() + (coordinate.max() - coordinate.min()) * newVal / width
        coordinate.setValue(newVal)
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
        if (!canvas.current)
            return
        let x: number
        let y: number
        if (coordinate instanceof Coordinate) {
            const width = canvas.current.clientWidth
            const t = new Transformation()
            t.offsetX = coordinate.min()
            t.scaleX = (coordinate.max() - coordinate.min()) / width
            x = t.x(e.offsetX)
            y = spline.compute(x)
        } else {
            x = coordinate
            y = spline.compute(coordinate)
        }
        setFocused([`x:${x.toPrecision(3)}`, `y:${y.toPrecision(3)}`])
    }

    function onIndicatorHover(e: MouseEvent) {
        if (!canvas.current || !indicator.current)
            return
        e.stopPropagation()
        let x: number
        let y: number
        if (coordinate instanceof Coordinate) {
            const width = canvas.current.clientWidth
            const t = new Transformation()
            t.offsetX = coordinate.min()
            t.scaleX = (coordinate.max() - coordinate.min()) / width
            x = t.x(indicator.current.offsetLeft + INDICATOR_WIDTH / 2 - RESIZE_WIDTH)
            y = spline.compute(x)
        } else {
            x = coordinate
            y = spline.compute(coordinate)
        }
        setFocused([`x:${x.toPrecision(3)}`, `y:${y.toPrecision(3)}`])
    }

    function onMouseLeave() {
        setFocused([])
    }

    function getBorderStyle() {
        return `${outputLink?.color ? (`2px solid ${outputLink.color}`) : 'unset'}`
    }

    function setBorderStyle() {
        if (!card.current)
            return
        card.current.style.border = getBorderStyle()
    }

    function onColorRefresh() {
        if (outputLink?.handleColorChange) {
            outputLink.color = genCardLinkColor()
            outputLink.handleColorChange()
            setBorderStyle()
        }
    }

    return <>
        <div class="spline-card" ref={card} style={{
            left: `${useContext(Offset).x + pos.current.x}px`,
            top: `${useContext(Offset).y + pos.current.y}px`,
            border: getBorderStyle()
        }}>
            {
                outputLink ?
                    <>
                        <div className="coord-indicator" ref={indicator}
                             onMouseDown={onIndicatorMouseDown} onMouseMove={onIndicatorHover}
                             onMouseLeave={onMouseLeave}
                        />
                        <div className="spline-refresh btn" onClick={onColorRefresh}>{Octicon['sync']}</div>
                    </> :
                    <></>
            }
            {
                useContext(ShowCoordName) ?
                    <div class="spline-coord">
                        {`${typeof coordinate == 'number' ? coordinate : coordinate.name}`}
                    </div> :
                    <></>
            }
            <div class="spline-drag" ref={drag} onMouseDown={onDragMouseDown}>{Octicon['three_bars']}</div>
            <div class="spline-resize" style={{gridArea: 'resize-left', cursor: 'ew-resize'}}
                 onMouseDown={buildResizeMouseDownHandler({width: -1, height: 0, posX: 1, posY: 0})}
            />
            <canvas class="spline-canvas" ref={canvas} style={{backgroundColor: 'transparent'}}
                    onMouseMove={onCanvasHover} onMouseLeave={onMouseLeave}>
                Ugh it seems your browser doesn't support HTML Canvas element.
            </canvas>
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
        </div>
    </>
}
