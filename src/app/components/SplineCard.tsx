import {StateUpdater, useContext, useEffect, useRef, useState} from 'preact/hooks'
import {Octicon} from "./index.js";
import {CubicSpline} from "deepslate";
import {clamp, Coordinate, CoordinateListener, pos2n} from "../Utils.js";
import {genCardLinkColor, Manager, Offset, PosResetCnt, ShowCoordName} from "./previews/SplinePreview.js";
import {DragHandle} from "./DragHandle.js";
import {mat3, vec2} from "gl-matrix";
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

export const DEFAULT_CARD_WIDTH = 200
export const DEFAULT_CARD_HEIGHT = 120

// TODO Determine supported version
export function SplineCard({
                               coordinate,
                               spline,
                               inputLinkList,
                               outputLink,
                               placePos = {x: 0, y: 0},
                               setFocused
                           }: Props) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const indicator = useRef<HTMLDivElement>(null)

    const [pos, setPos] = useState<vec2>([placePos.x, placePos.y])
    const [size, setSize] = useState<vec2>([DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT])
    const [borderStyle, setBorderStyle] = useState<string>(outputLink ? `2px solid ${outputLink.color}` : 'unset')
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
                    spline.calculateMinMax()
                    draw()
                    if (outputLink?.handleValueChange)
                        outputLink.handleValueChange(sample())
                }
                link.handleColorChange = () => draw()
            }
        }
        draw()
    }, [inputLinkList, spline, outputLink])

    function updateIndicatorPos(){
        if (canvas.current && indicator.current) {
            let newX: number
            const width = canvas.current.clientWidth
            if (typeof coordinate == 'number' || coordinate.min() == coordinate.max()) {
                newX = (width / 2 - INDICATOR_WIDTH / 2) / width
            } else {
                newX = (coordinate.val() - coordinate.min()) / (coordinate.max() - coordinate.min()) * width
                newX = (newX - INDICATOR_WIDTH / 2) / width
            }
            indicator.current.style.left = `${newX*100}%`
        }
    }

    function onIndicatorMove(e: MouseEvent) {
        e.stopPropagation()
        if (!(indicator.current) || !(canvas.current) || typeof coordinate == 'number' || coordinate.min() == coordinate.max())
            return

        const width = canvas.current.clientWidth
        let newVal = indicator.current.offsetLeft + e.movementX + INDICATOR_WIDTH / 2
        newVal = clamp(newVal, 0, width)
        newVal = newVal / width * (coordinate.max() - coordinate.min()) + coordinate.min()
        coordinate.setValue(newVal)
    }

    useEffect(() => updateIndicatorPos(), [size])

    function onCoordChange(redraw: boolean) {
        updateIndicatorPos()
        if (spline instanceof MultiPoint && coordinate instanceof Coordinate) {
            spline.coordinate = coordinate.toExtractor()();
        }
        if (outputLink?.handleValueChange) {
            outputLink.handleValueChange(sample())
        }
        spline.calculateMinMax()
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
        setPos([placePos.x, placePos.y])
        // Default width / height described in CSS, keep them matched with CSS value
        setSize([DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT])
        draw()
    }, [useContext(PosResetCnt)])

    function sample() {
        if (!indicator.current)
            return 0
        if (typeof coordinate == 'number')
            return spline.compute(coordinate)
        const X = size[0] - 2 * RESIZE_WIDTH
        const x = indicator.current.offsetLeft + INDICATOR_WIDTH / 2
        return spline.compute(coordinate.min() + x / X * (coordinate.max() - coordinate.min()))
    }

    // Draw curve
    function draw() {
        if (spline.min() === -Infinity && spline.max() === Infinity)
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
        const root = document.documentElement
        ctx.strokeStyle = getComputedStyle(root).getPropertyValue('--text-2')
        const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))

        if (spline instanceof Constant || typeof coordinate == 'number') {
            ctx.beginPath()
            ctx.moveTo(0, height / 2)
            ctx.lineTo(width, height / 2)
            ctx.stroke()
            return
        }

        const mat = mat3.create()
        console.log(coordinate)
        const offsetX = -coordinate.min() * width / (coordinate.max() - coordinate.min())
        const offsetY = height / 2
        const scaleX = width / (coordinate.max() - coordinate.min())
        const scaleY = -height / 2 / maxAbs
        mat3.translate(mat, mat, [offsetX, offsetY])
        mat3.scale(mat, mat, [scaleX, scaleY])

        ctx.clearRect(0, 0, width, height)
        ctx.beginPath()
        let point: vec2 = [coordinate.min(), spline.compute(coordinate.min())]
        vec2.transformMat3(point, point, mat)
        ctx.moveTo(point[0], point[1])
        for (let i = 1; i <= 100; i++) {
            point[0] = coordinate.min() + (coordinate.max() - coordinate.min()) * i / 100
            point[1] = spline.compute(coordinate.min() + (coordinate.max() - coordinate.min()) * i / 100)
            vec2.transformMat3(point, point, mat)
            ctx.lineTo(point[0], point[1])
        }
        ctx.stroke()

        let length = Math.min(30, height / 4)
        for (const link of inputLinkList) {
            ctx.strokeStyle = link.color
            ctx.beginPath()
            point[0] = spline.locations[link.valIndex]
            point[1] = spline.compute(point[0])
            vec2.transformMat3(point, point, mat)
            const y1 = point[1] - length / 2
            const y2 = point[1] + length / 2
            ctx.moveTo(point[0], y1)
            ctx.lineTo(point[0], y2)
            ctx.stroke()
        }
    }

    function move(dX: number, dY: number) {
        setPos(prevPos => [prevPos[0] + dX, prevPos[1] + dY])
    }

    function onDragMove(e: MouseEvent) {
        move(e.movementX, e.movementY)
    }

    function buildResizeHandler(direction: ResizeDirection) {
        return (e: MouseEvent) => {

            const width = size[0]
            const height = size[1]
            let dW = e.movementX * direction.width
            dW = clamp(width + dW, MIN_WIDTH, Infinity) - width
            let dX = Math.abs(dW) * Math.sign(e.movementX)

            let dH = e.movementY * direction.height
            dH = clamp(height + dH, MIN_HEIGHT, Infinity) - height
            let dY = Math.abs(dH) * Math.sign(e.movementY)

            move(dX * direction.posX, dY * direction.posY)
            setSize((prevSize) => [prevSize[0] + dW, prevSize[1] + dH])
        }
    }

    useEffect(() => draw(), [size])

    function onHover(e: MouseEvent) {
        if (!canvas.current)
            return
        let x: number
        let y: number
        if (coordinate instanceof Coordinate) {
            const width = canvas.current.clientWidth
            const mat = mat3.create()
            const offsetX = coordinate.min()
            const scaleX = (coordinate.max() - coordinate.min()) / width
            mat3.translate(mat, mat, [offsetX, 0])
            mat3.scale(mat, mat, [scaleX, 1])
            const point: vec2 = [e.offsetX, 0]
            vec2.transformMat3(point, point, mat)
            x = point[0]
            y = spline.compute(x)
            setFocused([`x:${x.toPrecision(3)}`, `y:${y.toPrecision(3)}`])
        } else {
            y = spline.compute(coordinate)
            setFocused([`y:${y.toPrecision(3)}`])
        }
    }

    function onMouseLeave() {
        setFocused([])
    }

    function updateBorderStyle() {
        setBorderStyle(`${outputLink?.color ? (`2px solid ${outputLink.color}`) : 'unset'}`)
    }

    function onColorRefresh() {
        if (outputLink?.handleColorChange) {
            outputLink.color = genCardLinkColor()
            outputLink.handleColorChange()
            updateBorderStyle()
        }
    }

    useEffect(() => updateBorderStyle(), [outputLink])

    return <>
        <div class="spline-card" style={{
            left: `${useContext(Offset).x + pos[0]}px`,
            top: `${useContext(Offset).y + pos[1]}px`,
            width: `${size[0]}px`,
            height: `${size[1]}px`,
            border: borderStyle
        }}>
            <div class={'indicator-zone'} onMouseMove={onHover} onMouseLeave={onMouseLeave}>
                <DragHandle class={`indicator${outputLink ? '' : ' hidden'}`} onDrag={onIndicatorMove} reference={indicator}/>
            </div>
            <div className={`refresh btn${outputLink ? '' : ' hidden'}`}
                 onClick={onColorRefresh}>{Octicon['sync']}</div>
            <div class={`coordinate${useContext(ShowCoordName) ? '' : ' hidden'}`}>
                {`${typeof coordinate == 'number' ? coordinate : coordinate.name}`}
            </div>
            <DragHandle class="drag" onDrag={onDragMove}>{Octicon['three_bars']}</DragHandle>
            <DragHandle class="resize left" onDrag={buildResizeHandler({width: -1, height: 0, posX: 1, posY: 0})}
            />
            <canvas ref={canvas} style={{backgroundColor: 'transparent'}}>
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
