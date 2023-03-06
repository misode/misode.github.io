import {StateUpdater, useContext, useEffect, useRef, useState} from 'preact/hooks'
import {Octicon} from "./index.js";
import {CubicSpline} from "deepslate";
import {clamp, Coordinate, CoordinateListener, pos2n} from "../Utils.js";
import {
    genCardLinkColor,
    Manager,
    Offset, PosResetCnt,
    ShowCoordName
} from "./previews/SplinePreview.js";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;
import {DragHandle} from "./DragHandle.js";

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
    const indicator = useRef<HTMLDivElement>(null)

    const [posX, setPosX] = useState(placePos.x)
    const [posY, setPosY] = useState(placePos.y)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
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

    useEffect(() => {
        setPosX(placePos.x)
        setPosY(placePos.y)
        if (card.current) {
            // Default width / height described in CSS, keep them matched with CSS value
            card.current.style.width = '200px'
            card.current.style.height = '120px'
        }
        draw()
    }, [useContext(PosResetCnt)])

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
        if(spline.min() === -Infinity && spline.max() === Infinity)
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
        setPosX((prevX => prevX + dX))
        setPosY((prevY => prevY + dY))
    }

    function onDragMove(e: MouseEvent) {
        if (!card.current)
            return
        move(e.movementX, e.movementY)
    }

    function buildResizeHandler(direction: ResizeDirection) {
        return (e: MouseEvent) => {
            if (!card.current)
                return

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
    }

    function onIndicatorMove(e: MouseEvent) {
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
            left: `${useContext(Offset).x + posX}px`,
            top: `${useContext(Offset).y + posY}px`,
            border: getBorderStyle()
        }}>
            {
                outputLink ?
                    <>
                        <DragHandle class="indicator" reference={indicator} onDrag={onIndicatorMove}/>
                        <div className="refresh btn" onClick={onColorRefresh}>{Octicon['sync']}</div>
                    </> :
                    <></>
            }
            {
                useContext(ShowCoordName) ?
                    <div class="coordinate"> {`${typeof coordinate == 'number' ? coordinate : coordinate.name}`} </div> :
                    <></>
            }
            <DragHandle class="drag" onDrag={onDragMove} propagate={false}>{Octicon['three_bars']}</DragHandle>
            <DragHandle class="resize left" onDrag={buildResizeHandler({width: -1, height: 0, posX: 1, posY: 0})}
            />
            <canvas ref={canvas} style={{backgroundColor: 'transparent'}}
                    onMouseMove={onCanvasHover} onMouseLeave={onMouseLeave}>
                Ugh it seems your browser doesn't support HTML Canvas element.
            </canvas>
            <DragHandle class="resize right" onDrag={buildResizeHandler({width: 1, height: 0, posX: 0, posY: 0})}
            />
            <DragHandle class="resize corner-left" onDrag={buildResizeHandler({width: -1, height: 1, posX: 1, posY: 0})}
            />
            <DragHandle class="resize bottom" onDrag={buildResizeHandler({width: 0, height: 1, posX: 0, posY: 0})}
            />
            <DragHandle class="resize corner-right" onDrag={buildResizeHandler({width: 1, height: 1, posX: 0, posY: 0})}
            />
        </div>
    </>
}
