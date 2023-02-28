import {useCallback, useEffect, useRef, useState} from 'preact/hooks'
import {Octicon} from "./Octicon.js";
import {CubicSpline} from "deepslate";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;

interface SplinePoint {
    derivative: number,
    location: number,
    value: Spline | number
}

interface Spline {
    noise: string,
    points: SplinePoint[]
}

interface Props {
    spline: MultiPoint<number> | Constant
}


export function SplineCard({spline}: Props) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const drag = useRef<HTMLDivElement>(null)
    const card = useRef<HTMLDivElement>(null)
    // TODO maybe not good practice
    const [ctx, setCtx] = useState<CanvasRenderingContext2D>()

    useEffect(() => {
        if (!canvas.current)
            return
        if (!ctx) {
            const ctx = canvas.current.getContext('2d')
            if (!ctx)
                return
            console.log("translating coord sys", ctx.getTransform())
            const width = canvas.current.clientWidth
            const height = canvas.current.clientHeight
            canvas.current.width = width
            canvas.current.height = height
            ctx.translate(width / 2, height / 2)
            ctx.scale(1, -1)
            console.log("translation complete", ctx.getTransform())
            setCtx(ctx)
        }
    }, [])

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!card.current)
            return
        card.current.style.left = `${card.current.offsetLeft + e.movementX}px`
        card.current.style.top = `${card.current.offsetTop + e.movementY}px`
    }, [])

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (!drag.current)
            return
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
    }, [])

    const onMouseDown = useCallback((e: MouseEvent) => {
        if (!drag.current)
            return
        if (e.button != 0)
            return
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [])

    useEffect(() => {
        console.log("spline changed")
        console.log(spline)
        spline.calculateMinMax()
        if (!canvas.current)
            return
        if (!ctx)
            return
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
        const width = canvas.current.width
        const height = canvas.current.height
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
    }, [spline])

    return <div class="spline-card" ref={card}>
        <div class="spline-drag" ref={drag} onMouseDown={onMouseDown}>{Octicon['code']}</div>
        <div class="spline-resize" style={{gridArea: 'resize-left'}}/>
        <canvas class="spline-canvas" ref={canvas} style={{backgroundColor: 'transparent'}}>A canvas.</canvas>
        <div class="spline-resize" style={{gridArea: 'resize-right'}}/>
        <div class="spline-resize" style={{gridArea: 'resize-corner-left'}}/>
        <div class="spline-resize" style={{gridArea: 'resize-bottom'}}/>
        <div class="spline-resize" style={{gridArea: 'resize-corner-right'}}/>
    </div>
}
