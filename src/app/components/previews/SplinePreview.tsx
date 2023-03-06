import {SplineCard, CardLink} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline} from "deepslate";
import {createContext} from "preact";
import fromJson = CubicSpline.fromJson;
import {useMemo, useRef, useState} from "preact/hooks";
import {Coordinate, CoordinateManager, pos2n, simpleHash} from "../../Utils.js";
import {Btn, BtnMenu, BtnInput} from "../index.js";
import {useLocale} from "../../contexts/index.js";
import {DragHandle} from "../DragHandle.js";

export const Offset = createContext<pos2n>({x: 0, y: 0})
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

    const [offset, setOffset] = useState({x: 0, y: 0})
    const [focused, setFocused] = useState<string[]>([])
    const [showCoordName, setShowCoordName] = useState<boolean>(true)
    const [posResetCnt, setPosResetCnt] = useState(0)
    const managerRef = useRef<CoordinateManager>(new CoordinateManager())

    function build(data: any, outputLink: CardLink | null, placePos: pos2n):
        { elements: JSX.Element[], defaultVal: number, height: number } {
        function checkSpline(data: any): boolean {
            if (typeof data === 'number')
                return true
            if (typeof data !== 'object')
                return false
            if (!('coordinate' in data) || !('points' in data))
                return false
            let coordType = typeof data.coordinate
            if (coordType != 'string' && coordType != 'number')
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
        // Keep it matched with CSS height of spline-card in global.css
        const DEFAULT_CARD_HEIGHT = 120
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
                        placePos={{x: placePos.x + INDENT, y: placePos.y + INDENT}}
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
                    {x: placePos.x + INDENT, y: placePos.y + totHeight}
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
        const coordName = typeof spline.coordinate == 'object' ?
            `Inline${simpleHash(JSON.stringify(spline.coordinate))}` :
            `${spline.coordinate}`
        const coordinate = managerRef.current.addOrGetCoordinate(coordName)
        const cubicSpline = fromJson(spline, coordinate.toExtractor())
        result = [...result, <SplineCard
            coordinate={coordinate}
            spline={cubicSpline}
            inputLinkList={inputLinkList}
            outputLink={outputLink}
            placePos={{x: placePos.x + INDENT, y: placePos.y + INDENT}}
            setFocused={setFocused}
        />]


        return {elements: result, defaultVal: cubicSpline.compute(coordinate.val()), height: totHeight}
    }

    const cards = useMemo(() => {
        managerRef.current.initiateCleanup()
        const result = build(data, null, {x: 0, y: 0})
        managerRef.current.doCleanup()
        return result.elements
    }, [data])

    function onMouseMove(e: MouseEvent) {
        setOffset((prevOffset) => {
            return {
                x: prevOffset.x + e.movementX,
                y: prevOffset.y + e.movementY
            }
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
                    }}/>
                    <BtnInput label="Max: " value={coordinate.max().toString()} onChange={value => {
                        const n = Number(value)
                        if (!isNaN(n)) coordinate.setMax(n)
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
                <Btn icon={showCoordName ? 'square_fill' : 'square'} label={locale('preview.show_coord_name')}
                     onClick={() => setShowCoordName(!showCoordName)}/>
                {mapCoordMinMaxControls()}
            </BtnMenu>
            <Btn icon="sync" onClick={() => {
                setPosResetCnt(posResetCnt + 1)
                setOffset({x: 0, y: 0})
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