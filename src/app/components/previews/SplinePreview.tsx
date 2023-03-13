import {SplineCard, CardLink, DEFAULT_CARD_HEIGHT} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline, MinMaxNumberFunction} from "deepslate";
import {createContext} from "preact";
import fromJson = CubicSpline.fromJson;
import {useMemo, useRef, useState} from "preact/hooks";
import {Coordinate, CoordinateManager, hashString} from "../../Utils.js";
import {Btn, BtnMenu, BtnInput} from "../index.js";
import {useLocale} from "../../contexts/index.js";
import {DragHandle} from "../DragHandle.js";
import {vec2} from "gl-matrix";

export const Offset = createContext<vec2>([0, 0])
export const ShowCoordName = createContext<boolean>(true)
export const Manager = createContext<CoordinateManager>(new CoordinateManager())
export const PosResetCnt = createContext(0)

export function genCardLinkColor() {
	let hue = Math.floor(Math.random() * 360)
	let saturation = Math.round(Math.random() * 50) + 50
	let lightness = Math.round(Math.random() * 30) + 50
	return `hsl(${hue}, ${saturation}%, ${lightness}%`
}

export const SplinePreview = ({data}: PreviewProps) => {
	const {locale} = useLocale()

	const [offset, setOffset] = useState<vec2>([0, 0])
	const [focused, setFocused] = useState<string[]>([])
	const [showCoordName, setShowCoordName] = useState<boolean>(true)
	const [posResetCnt, setPosResetCnt] = useState(0)
	const [, setManualUpdate] = useState<number>(0)
	const managerRef = useRef<CoordinateManager>(new CoordinateManager())

	function build(data: any, outputLink: CardLink | null, placePos: vec2):
		{ elements: JSX.Element[], defaultVal: number, height: number } {
		function checkSpline(data: any): boolean {
			if (typeof data === 'number')
				return true
			if (typeof data !== 'object')
				return false
			if (!('coordinate' in data) || !('points' in data))
				return false
			let coordType = typeof data.coordinate
			if (coordType != 'string' && coordType != 'number' && coordType != 'object')
				return false
			return data.points instanceof Array;

		}

		function checkPoint(point: any): boolean {
			if (!('node' in point))
				return false
			if (!('derivative' in point.node) || !('location' in point.node) || !('value' in point.node))
				return false
			if (typeof point.node.derivative !== 'number' || typeof point.node.location !== 'number')
				return false
			return checkSpline(point.node.value)
		}

		const INDENT = 10
		let result: JSX.Element[] = []
		if (!checkSpline(data))
			return {elements: result, defaultVal: 0, height: 0}
		let totHeight = INDENT + DEFAULT_CARD_HEIGHT
		if (typeof data == 'number') {
			const coordinate = new Coordinate(`${data}`, managerRef.current)
			coordinate.setMax(data)
			coordinate.setMin(data)
			return {
				elements: [
					<SplineCard
						spline={fromJson(data, coordinate.toExtractor())}
						coordinate={data}
						inputLinkList={[]}
						outputLink={outputLink}
						placePos={[placePos[0] + INDENT, placePos[1] + INDENT]}
						setFocused={setFocused}/>
				],
				defaultVal: data,
				height: totHeight
			}
		}
		const spline = {
			coordinate: data.coordinate,
			points: Array<{ derivative: number, location: number, value: number }>(0)
		}
		let inputLinkList: CardLink[] = []
		for (let i = 0; i < data.points.length; i++) {
			const point = data.points[i]
			if (!checkPoint(point))
				continue

			if (typeof point.node.value === 'number')
				spline.points.push(point.node)
			else {
				const inputLink: CardLink = {
					valIndex: i,
					color: genCardLinkColor(),
					handleValueChange: null,
					handleColorChange: null
				}
				let buildResult = build(
					point.node.value,
					inputLink,
					[placePos[0] + INDENT, placePos[1] + totHeight]
				)
				totHeight += buildResult.height
				spline.points.push({
					derivative: point.node.derivative,
					location: point.node.location,
					value: buildResult.elements.length > 0 ? buildResult.defaultVal : 0
				})
				result = [...result, ...buildResult.elements]
				inputLinkList = [...inputLinkList, inputLink]
			}
		}

		let coordinate: number | Coordinate
		switch (typeof spline.coordinate) {
			case 'number':
				coordinate = spline.coordinate;
				break
			case 'string':
				coordinate = managerRef.current.addOrGetCoordinate(spline.coordinate);
				break
			case 'object':
				coordinate = managerRef.current.addOrGetCoordinate(`Inline${hashString(JSON.stringify(spline.coordinate))}`);
				break
			default:
				throw 'The given coordinate is neither number, string or object. Contact dev. '
		}
		const extractor: () => MinMaxNumberFunction<number> = coordinate instanceof Coordinate ?
			coordinate.toExtractor() :
			(): MinMaxNumberFunction<number> => {
				return {
					compute: (c: number) => {return c},
					minValue: () => {return spline.coordinate},
					maxValue: () => {return spline.coordinate}
				}
			}
		const cubicSpline = fromJson(spline, extractor)
		result = [...result, <SplineCard
			coordinate={coordinate}
			spline={cubicSpline}
			inputLinkList={inputLinkList}
			outputLink={outputLink}
			placePos={[placePos[0] + INDENT, placePos[1] + INDENT]}
			setFocused={setFocused}
		/>]
		const x = coordinate instanceof Coordinate ? coordinate.val() : coordinate
		return {elements: result, defaultVal: cubicSpline.compute(x), height: totHeight}
	}

	const cards = useMemo(() => {
		managerRef.current.initiateCleanup()
		const result = build(data, null, [0, 0])
		managerRef.current.doCleanup()
		return result.elements
	}, [data])

	function onMouseMove(e: MouseEvent) {
		setOffset((prevOffset) => {
			return [prevOffset[0] + e.movementX, prevOffset[1] + e.movementY]
		})
	}

	function mapCoordMinMaxControls() {
		let result: JSX.Element[] = []
		for (const coordinate of managerRef.current.coordinates.values()) {
			result.push(<>
					<Btn label={coordinate.name}></Btn>
					<BtnInput label="Min: " value={coordinate.min().toString()} onChange={value => {
						const n = Number(value)
						if (!isNaN(n)) coordinate.setMin(n)
						setManualUpdate(prev => prev + 1)
					}}/>
					<BtnInput label="Max: " value={coordinate.max().toString()} onChange={value => {
						const n = Number(value)
						if (!isNaN(n)) coordinate.setMax(n)
						setManualUpdate(prev => prev + 1)
					}}/>
				</>
			)
		}
		return result
	}

	return <>
		<div class="controls preview-controls">
			{focused.map(s => <Btn label={s} class="no-pointer"/>)}
			<BtnMenu icon="gear" tooltip={locale('settings')}>
				<Btn icon={showCoordName ? 'square_fill' : 'square'} label={locale('preview.show_coord_name')} onClick={() => setShowCoordName(!showCoordName)}/>
				{mapCoordMinMaxControls()}
			</BtnMenu>
			<Btn icon="sync" onClick={() => {
				setPosResetCnt(posResetCnt + 1)
				setOffset([0, 0])
			}} tooltip={locale('reset_card_layout')}/>
		</div>
		<div class="full-preview">
			<DragHandle class="spline-preview" onDrag={onMouseMove}>
				<Offset.Provider value={offset}>
					<ShowCoordName.Provider value={showCoordName}>
						<Manager.Provider value={managerRef.current}>
							<PosResetCnt.Provider value={posResetCnt}>
								{cards}
							</PosResetCnt.Provider>
						</Manager.Provider>
					</ShowCoordName.Provider>
				</Offset.Provider>
			</DragHandle>
		</div>
	</>
}