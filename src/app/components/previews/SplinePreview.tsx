import {SplineCard, DEFAULT_CARD_HEIGHT} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline} from "deepslate";
import {createContext} from "preact";
import {StateUpdater, useMemo, useRef, useState} from "preact/hooks";
import {ColoredCachedMP, CoordinateManager} from "../../Utils.js";
import {Btn, BtnMenu, BtnInput} from "../index.js";
import {useLocale} from "../../contexts/index.js";
import {DragHandle} from "../DragHandle.js";
import {vec2} from "gl-matrix";
import Constant = CubicSpline.Constant
import MultiPoint = CubicSpline.MultiPoint

export const Offset = createContext<vec2>([0, 0])
export const ShowCoordName = createContext<boolean>(true)
export const Manager = createContext<CoordinateManager>(new CoordinateManager())
export const PosResetCnt = createContext(0)
export const UpdateAllCnt = createContext(0)
export const SetUpdateAll = createContext<StateUpdater<number> | null>(null)

export const SplinePreview = ({data}: PreviewProps) => {
	const {locale} = useLocale()

	const [offset, setOffset] = useState<vec2>([0, 0])
	const [focused, setFocused] = useState<string[]>([])
	const [showCoordName, setShowCoordName] = useState<boolean>(true)
	const [posResetCnt, setPosReset] = useState(0)
	const [updateAllCnt, setUpdateAll] = useState(0)
	const managerRef = useRef<CoordinateManager>(new CoordinateManager())

	function clean(data: any): any {
		if (typeof data == 'number')
			return data
		const result: any = {
			coordinate: data.coordinate,
			points: []
		}
		for (const point of data.points) {
			result.points.push({
				location: point.node.location,
				derivative: point.node.derivative,
				value: clean(point.node.value)
			})
		}
		return result
	}

	const processedSplineTree = useMemo(() => {
		const cubicSpline = CubicSpline.fromJson(clean(data), managerRef.current.getExtractor())
		if (cubicSpline instanceof Constant)
			return cubicSpline
		return new ColoredCachedMP(cubicSpline, 1)
	}, [data])

	function build(spline: Constant | ColoredCachedMP, placePos: vec2):
		{ elements: JSX.Element[], height: number } {

		const INDENT = 10
		let elements: JSX.Element[] = []
		let totHeight = INDENT + DEFAULT_CARD_HEIGHT
		if (spline instanceof MultiPoint) {
			for (const value of spline.values) {
				if (!(value instanceof ColoredCachedMP))
					continue
				let buildResult = build(
					value,
					[placePos[0] + INDENT, placePos[1] + totHeight]
				)
				totHeight += buildResult.height
				elements = [...elements, ...buildResult.elements]
			}
		}

		elements.push(<SplineCard
			spline={spline}
			placePos={[placePos[0] + INDENT, placePos[1] + INDENT]}
			setFocused={setFocused}
		/>)
		return {elements: elements, height: totHeight}
	}

	const cards = useMemo(() => {
		managerRef.current.initiateCleanup()
		const result = build(processedSplineTree, [0, 0])
		managerRef.current.doCleanup()
		return result.elements
	}, [processedSplineTree])

	function onMouseMove(e: MouseEvent) {
		setOffset((prevOffset) => {
			return [prevOffset[0] + e.movementX, prevOffset[1] + e.movementY]
		})
	}

	function coordMinMaxControls() {
		let result: JSX.Element[] = []
		for (const coordinate of managerRef.current.coordinates.values()) {
			result.push(<>
					<Btn label={coordinate.name}></Btn>
					<BtnInput label="Min: " value={coordinate.minValue().toString()} onChange={value => {
						const n = Number(value)
						if (!isNaN(n)) coordinate.setMin(n)
						setPosReset(prev => prev + 1)
					}}/>
					<BtnInput label="Max: " value={coordinate.maxValue().toString()} onChange={value => {
						const n = Number(value)
						if (!isNaN(n)) coordinate.setMax(n)
						setPosReset(prev => prev + 1)
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
				{coordMinMaxControls()}
			</BtnMenu>
			<Btn icon="sync" onClick={() => {
				setPosReset(posResetCnt + 1)
				setOffset([0, 0])
			}} tooltip={locale('reset_card_layout')}/>
		</div>
		<div class="full-preview">
			<DragHandle class="spline-preview" onDrag={onMouseMove}>
				<Offset.Provider value={offset}>
					<ShowCoordName.Provider value={showCoordName}>
						<Manager.Provider value={managerRef.current}>
							<PosResetCnt.Provider value={posResetCnt}>
								<SetUpdateAll.Provider value={setUpdateAll}>
									<UpdateAllCnt.Provider value={updateAllCnt}>
										{cards}
									</UpdateAllCnt.Provider>
								</SetUpdateAll.Provider>
							</PosResetCnt.Provider>
						</Manager.Provider>
					</ShowCoordName.Provider>
				</Offset.Provider>
			</DragHandle>
		</div>
	</>
}