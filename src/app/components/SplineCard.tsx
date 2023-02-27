import {useEffect, useRef, useState} from 'preact/hooks'
import {Octicon} from "./Octicon.js";
import {CubicSpline} from "deepslate";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;

interface SplinePoint{
	derivative: number,
	location: number, 
	value: Spline | number
}

interface Spline{
	noise: string,
	points: SplinePoint[]
}

interface Props {
	spline: MultiPoint<number> | Constant
}


export function SplineCard({spline}: Props){
	const canvas = useRef<HTMLCanvasElement>(null)
	const [ctx, setCtx] = useState<CanvasRenderingContext2D>()

	useEffect(() => {
		if(!canvas.current)
			return
		if(!ctx) {
			const ctx = canvas.current.getContext('2d')
			if (!ctx)
				return
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = 'high'
			console.log("translating coord sys", ctx.getTransform())
			ctx.translate(canvas.current.width/2, canvas.current.height/2)
			ctx.scale(1, -1)
			console.log("translation complete", ctx.getTransform())
			setCtx(ctx)
		}
	}, [])
	
	useEffect( () => {
		console.log("spline changed")
		console.log(spline)
		spline.calculateMinMax()
		if(!canvas.current)
			return
		if(!ctx)
			return
		let minX = 0
		let maxX = 0
		// TODO solve situations where all locations have same val
		// TODO in this case minX and maxX are equal, should state err or sth
		if ((spline instanceof MultiPoint) && spline.locations.length > 1) {
			minX = spline.locations[0]
			maxX = spline.locations[0]
			for(const location of spline.locations){
				if(location > maxX)
					maxX = location
				if(location < minX)
					minX = location
			}
		} else {
			minX = -1
			maxX = 1
		}

		console.log("drawing curve")
		const width = canvas.current.width
		const height = canvas.current.height
		ctx.clearRect(-width/2, -height/2, width, height)
		ctx.beginPath()
		const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))
		ctx.strokeStyle = "rgb(154,154,154)"
		console.log(-width/2, spline.compute(minX)*(height/2)/maxAbs)
		ctx.moveTo(-width/2, spline.compute(minX)*(height/2)/maxAbs)
		for(let i = 1; i <= 100; i++){
			let x = -width/2 + width/100*i
			let y = spline.compute(minX + (maxX-minX)/100*i)*(height/2)/maxAbs
			ctx.lineTo(x, y)
		}
		ctx.stroke()
	}, [spline])

	return <div class="spline-card">
		<div class="spline-drag">{Octicon['code']}
		</div>
		<canvas ref={canvas} class="spline-canvas">A canvas. </canvas>
	</div>
}
