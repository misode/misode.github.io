import {StateUpdater, useContext, useEffect, useRef, useState} from 'preact/hooks'
import {Octicon} from "./index.js";
import {CubicSpline} from "deepslate";
import {clamp, ColoredCachedMP, Coordinate} from "../Utils.js";
import {Offset, PosResetCnt, SetUpdateAll, ShowCoordName, UpdateAllCnt} from "./previews/SplinePreview.js";
import {DragHandle} from "./DragHandle.js";
import {mat3, vec2} from "gl-matrix";
import MultiPoint = CubicSpline.MultiPoint;
import Constant = CubicSpline.Constant;

interface Props {
	spline: Constant | ColoredCachedMP
	placePos: vec2
	setFocused: StateUpdater<string[]>
}

interface ResizeDirection {
	width: number
	height: number
	posX: number
	posY: number
}

const INDICATOR_WIDTH = 2
const MIN_WIDTH = 112
const MIN_HEIGHT = 81

// Class for simple transformation, translation and scale only

export const DEFAULT_CARD_WIDTH = 200
export const DEFAULT_CARD_HEIGHT = 120

// TODO Determine supported version
export function SplineCard({spline, placePos = [0, 0], setFocused }: Props) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const indicator = useRef<HTMLDivElement>(null)

	const [pos, setPos] = useState<vec2>([placePos[0], placePos[1]])
	const [size, setSize] = useState<vec2>([DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT])
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
	const setUpdateAllRef = useRef(useContext(SetUpdateAll))

	useEffect(function updateIndicatorPos() {
		if (canvas.current && indicator.current) {
			let newX: number
			const width = canvas.current.clientWidth
			const coordinate = spline instanceof MultiPoint ? spline.coordinate as Coordinate : null
			if (coordinate == null || coordinate.isConstant()) {
				newX = (width / 2 - INDICATOR_WIDTH / 2) / width
			} else {
				newX = (coordinate.value() - coordinate.minValue()) / (coordinate.maxValue() - coordinate.minValue()) * width
				newX = (newX - INDICATOR_WIDTH / 2) / width
			}
			indicator.current.style.left = `${newX * 100}%`
		}
	}, [useContext(UpdateAllCnt)])

	useEffect(() => {
		if (spline instanceof ColoredCachedMP)
			spline.updateCache()
		draw()
	}, [useContext(UpdateAllCnt), spline])

	function onIndicatorMove(e: MouseEvent) {
		if (spline instanceof Constant)
			return
		const coordinate = (spline.coordinate as Coordinate)
		if (!(indicator.current) || !(canvas.current) || coordinate.isConstant())
			return

		const width = canvas.current.clientWidth
		let newVal = indicator.current.offsetLeft + e.movementX + INDICATOR_WIDTH / 2
		newVal = clamp(newVal, 0, width)
		newVal = newVal / width * (coordinate.maxValue() - coordinate.minValue()) + coordinate.minValue()
		coordinate.setValue(newVal)
		if (setUpdateAllRef.current)
			setUpdateAllRef.current(prev => prev+1)
	}

	useEffect(() => {
		setPos([placePos[0], placePos[1]])
		setSize([DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT])
		draw()
	}, [useContext(PosResetCnt)])

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

		if (spline instanceof Constant || spline.min() == spline.max() || (spline.coordinate as Coordinate).isConstant()) {
			ctx.beginPath()
			ctx.moveTo(0, height / 2)
			ctx.lineTo(width, height / 2)
			ctx.stroke()
			return
		}

		const coordinate = (spline.coordinate as Coordinate)

		const mat = mat3.create()
		const offsetX = -coordinate.minValue() * width / (coordinate.maxValue() - coordinate.minValue())
		const offsetY = height / 2
		const scaleX = width / (coordinate.maxValue() - coordinate.minValue())
		const scaleY = -height / 2 / maxAbs
		mat3.translate(mat, mat, [offsetX, offsetY])
		mat3.scale(mat, mat, [scaleX, scaleY])

		ctx.clearRect(0, 0, width, height)
		ctx.beginPath()
		let point: vec2 = [spline.cachedCurve[0][0], spline.cachedCurve[0][1]]
		vec2.transformMat3(point, point, mat)
		ctx.moveTo(point[0], point[1])
		for (let i in spline.cachedCurve) {
			if (i == '0')
				continue
			point = [spline.cachedCurve[i][0], spline.cachedCurve[i][1]]
			vec2.transformMat3(point, point, mat)
			ctx.lineTo(point[0], point[1])
		}
		ctx.stroke()

		let length = Math.min(30, height / 4)
		for (const i in spline.values) {
			const value = spline.values[i]
			if (!(value instanceof ColoredCachedMP))
				continue
			ctx.strokeStyle = value.color
			ctx.beginPath()
			point[0] = spline.locations[i]
			point[1] = spline.compute({x: point[0], drawCoord: (spline.coordinate as Coordinate)})
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
		const coordinate = spline instanceof MultiPoint ? (spline.coordinate as Coordinate) : null
		if (coordinate != null && !coordinate.isConstant()) {
			const width = canvas.current.clientWidth
			const mat = mat3.create()
			const offsetX = coordinate.minValue()
			const scaleX = (coordinate.maxValue() - coordinate.minValue()) / width
			mat3.translate(mat, mat, [offsetX, 0])
			mat3.scale(mat, mat, [scaleX, 1])
			const point: vec2 = [e.offsetX, 0]
			vec2.transformMat3(point, point, mat)
			x = point[0]
			y = spline.compute({x: x, drawCoord: coordinate})
			setFocused([`x:${x.toPrecision(3)}`, `y:${y.toPrecision(3)}`])
		} else {
			y = coordinate ? spline.compute({x: coordinate.value(), drawCoord: coordinate}) : (spline as Constant).compute()
			setFocused([`y:${y.toPrecision(3)}`])
		}
	}

	function onMouseLeave() {
		setFocused([])
	}

	function onColorRefresh() {
		if (spline instanceof ColoredCachedMP) {
			spline.genColor()
			if (setUpdateAllRef.current)
				setUpdateAllRef.current(prev => prev+1)
		}
	}

	return <>
		<div class="spline-card" style={{
			left: `${useContext(Offset)[0] + pos[0]}px`,
			top: `${useContext(Offset)[1] + pos[1]}px`,
			width: `${size[0]}px`,
			height: `${size[1]}px`,
			border: spline instanceof ColoredCachedMP ? `2px solid ${spline.color}` : 'unset'
		}}>
			<div class={'indicator-zone'} onMouseMove={onHover} onMouseLeave={onMouseLeave}>
				<DragHandle class={`indicator`} onDrag={onIndicatorMove}
							reference={indicator}/>
			</div>
			<div class={`refresh btn${spline instanceof ColoredCachedMP && spline.color != 'unset' ? '' : ' hidden'}`} onClick={onColorRefresh}>{Octicon['sync']}</div>
			<div class={`coordinate${useContext(ShowCoordName) ? '' : ' hidden'}`}>
				{`${spline instanceof Constant ? spline.compute() : (spline.coordinate as Coordinate).name}`}
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
