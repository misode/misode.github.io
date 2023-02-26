import {useEffect, useRef} from 'preact/hooks'
import {Octicon} from "./Octicon.js";

interface SplinePoint{
	derivative: number,
	location: number, 
	value: Spline
}

interface Spline{
	noise: string,
	constant?: number,
	points: SplinePoint[]
}

/*
interface Props {
	spline: Spline,
	posX?: number,
	posY?: number,
	color?: string
}
 */

export function SplineCard(){
	const canvas = useRef<HTMLCanvasElement>(null)
	const ctx = useRef<CanvasRenderingContext2D>()
	
	useEffect( () => {
		if(!canvas.current) {
			console.log("canvas ref is null")
			return
		}
		const ctx2D = canvas.current.getContext('2d')
		if(!ctx2D) {
			console.log("failed to get context")
			return
		}
		console.log("drawing rect")
		ctx.current = ctx2D
		ctx.current.fillStyle = "rgb(200,0,0)";
		ctx.current.fillRect (10, 10, 55, 50);
	}, [])

	return <div class="spline-card">
		<div class="spline-drag">{Octicon['code']}
		</div>
		<canvas ref={canvas} class="spline-canvas">A canvas. </canvas>
	</div>
}
