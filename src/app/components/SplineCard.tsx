import {useCallback, useEffect, useRef, useState} from 'preact/hooks'
import {Octicon} from "./Octicon.js";
import {CubicSpline} from "deepslate";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;

interface Props {
    spline: MultiPoint<number> | Constant
}

interface ResizeDirection {
    width: number
    height: number
    posX: number
    posY: number
}

export function SplineCard({spline}: Props) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const drag = useRef<HTMLDivElement>(null)
    const card = useRef<HTMLDivElement>(null)
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

    // Draw curve
    useEffect(() => {
        console.log("spline changed")
        console.log(spline)
        spline.calculateMinMax()
        if (!canvas.current)
            return
        if (!ctx)
            return

        console.log("translating coord sys", ctx.getTransform())
        const width = canvas.current.clientWidth
        const height = canvas.current.clientHeight
        canvas.current.width = width
        canvas.current.height = height
        ctx.resetTransform()
        ctx.translate(width / 2, height / 2)
        ctx.scale(1, -1)
        console.log("translation complete", ctx.getTransform())

        let minX = 0
        let maxX = 0
        // TODO solve situations where all locations have same val
        // TODO in this case minX and maxX are equal, should state err or sth
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

        console.log("drawing curve")
        console.log('canvas size is: ', [width, height])
        console.log('client size is: ', [canvas.current.clientWidth, canvas.current.clientHeight])
        ctx.clearRect(-width / 2, -height / 2, width, height)
        ctx.beginPath()
        const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))
        ctx.strokeStyle = "rgb(154,154,154)"
        console.log(-width / 2, spline.compute(minX) * (height / 2) / maxAbs)
        ctx.moveTo(-width / 2, spline.compute(minX) * (height / 2) / maxAbs)
        for (let i = 1; i <= 100; i++) {
            let x = -width / 2 + width / 100 * i
            let y = spline.compute(minX + (maxX - minX) / 100 * i) * (height / 2) / maxAbs
            ctx.lineTo(x, y)
        }
        ctx.stroke()
    }, [spline, canvas.current?.clientHeight, canvas.current?.clientWidth])

    const buildResizeMouseDownHandler = useCallback((direction: ResizeDirection) => {
        return (e: MouseEvent) => {
            if(e.button != 0)
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
        card.current.style.width = `${card.current.clientWidth + e.movementX*direction.width}px`
        card.current.style.height = `${card.current.clientHeight + e.movementY*direction.height}px`
        card.current.style.left = `${card.current.offsetLeft + e.movementX*direction.posX}px`
        card.current.style.top = `${card.current.offsetTop + e.movementY*direction.posY}px`
    }, [])

    const onResizeMouseUp = useCallback((e: MouseEvent) => {
        if(e.button != 0)
            return
        document.removeEventListener('mousemove', onResizeMouseMove)
        document.removeEventListener('mousemove', onResizeMouseUp)
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
    </div>
}
