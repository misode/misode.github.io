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

	useEffect(() => {
		if(!canvas.current)
			return
		const ctx = canvas.current.getContext('2d')
		if(!ctx)
			return
		console.log("translating coord sys")
		ctx.translate(canvas.current.width/2, canvas.current.height/2)
		ctx.scale(1, -1)
	}, [canvas])

	const [ minX, setMinX ] = useState(-1)
	const [ maxX, setMaxX ] = useState(1)
	
	useEffect( () => {
		console.log("spline changed")
		console.log(spline)
		spline.calculateMinMax()
		if(!canvas.current)
			return
		const ctx = canvas.current.getContext('2d')
		if(!ctx)
			return
		const width = canvas.current.width
		const height = canvas.current.height
		ctx.clearRect(-width/2, -height/2, width, height)
		ctx.fillStyle = "rgb(255,255,255)";
		ctx.beginPath()
		if ((spline instanceof MultiPoint) && spline.locations.length > 1) {
			setMinX(spline.locations[0])
			setMaxX(spline.locations[0])
			for(const location of spline.locations){
				if(location > maxX)
					setMaxX(location)
				if(location < minX)
					setMinX(location)
			}
		} else {
			setMinX(-1)
			setMaxX(1)
		}

		console.log("drawing curve")
		const maxAbs = Math.max(Math.abs(spline.max()), Math.abs(spline.min()))
		ctx.strokeStyle = "rgb(154,154,154)"
		console.log(-width/2, spline.compute(minX)/height*maxAbs)
		ctx.moveTo(-width/2, spline.compute(minX)/height*maxAbs)
		for(let i = 1; i <= 100; i++){
			ctx.lineTo(-width/2 + width/100*i, spline.compute(minX + (maxX-minX)/100*i)/height*maxAbs)
		}
		ctx.stroke()
	}, [spline])

	return <div class="spline-card">
		<div class="spline-drag">{Octicon['code']}
		</div>
		<canvas ref={canvas} class="spline-canvas">A canvas. </canvas>
	</div>
}
