import {SplineCard, CardLink} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline, MinMaxNumberFunction} from "deepslate";
import {createContext} from "preact";
import fromJson = CubicSpline.fromJson;
import {StateUpdater, useCallback, useMemo, useRef, useState} from "preact/hooks";
import {pos2n} from "../../Utils.js";
import {Btn} from "../Btn.js";
import {BtnMenu} from "../BtnMenu.js";
import {useLocale} from "../../contexts/index.js";

function extractor(): MinMaxNumberFunction<number> {
    return {
        compute(c: number): number {
            return c
        },
        // TODO this need to be changed later
        minValue(): number {
            return -2
        },
        maxValue(): number {
            return 2
        }
    }
}

function checkSpline(data: any): boolean {
    if (typeof data === 'number')
        return true
    if (typeof data !== 'object')
        return false
    if (!('coordinate' in data) || !('points' in data))
        return false
    let coordType = typeof data.coordinate
    if (coordType != 'string' && coordType != 'number' && coordType != 'bigint')
        return false
    if (!(data.points instanceof Array))
        return false
    return true
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

export const Offset = createContext<pos2n>({x: 0, y: 0})
export const ShowCoordName = createContext<boolean>(true)

export function genCardLinkColor() {
    let hue = Math.floor(Math.random() * 360)
    let saturation = Math.round(Math.random() * 50) + 50
    let lightness = Math.round(Math.random() * 30) + 50
    return `hsl(${hue}, ${saturation}%, ${lightness}%`
}

// TODO More careful type check, or check if such check is necessary

export const SplinePreview = ({data}: PreviewProps) => {
    console.log(data)
    const {locale} = useLocale()

    const [offset, setOffset] = useState({x: 0, y: 0})
    const [focused, setFocused] = useState<string[]>([])
    const [showCoordName, setShowCoordName] = useState<boolean>(true)
    const offsetRef = useRef<pos2n>(offset)

    function build(data: any, outputLink: CardLink | null, placePos: pos2n):
        { elements: JSX.Element[], defaultVal: number, height: number } {
        const INDENT = 10
        // Keep it matched with CSS height of spline-card in global.css
        const DEFAULT_CARD_HEIGHT = 120
        let result: JSX.Element[] = []
        if (!checkSpline(data))
            return {elements: result, defaultVal: 0, height: 0}
        let totHeight = INDENT + DEFAULT_CARD_HEIGHT
        if (typeof data == 'number') {
            return {
                elements: [
                    <SplineCard
                        spline={fromJson(data, extractor)}
                        coordinate={'Constant'}
                        inputLinkList={[]}
                        outputLink={outputLink}
                        placePos={{x: placePos.x + INDENT, y: placePos.y + INDENT}}
                        setFocused={setFocused}/>],
                defaultVal: data,
                height: totHeight
            }
        }
        let spline = {}
        spline.coordinate = data.coordinate
        spline.points = []
        let inputLinkList: CardLink[] = []
        let minX = Infinity, maxX = -Infinity
        for (let i = 0; i < data.points.length; i++) {
            const point = data.points[i]
            if (!checkPoint(point))
                continue
            if (point.node.location > maxX)
                maxX = point.node.location
            if (point.node.location < minX)
                minX = point.node.location

            if (typeof point.node.value === 'number')
                spline.points.push(point.node)
            else {
                const inputLink: CardLink = {valIndex: i, color: genCardLinkColor(), handleValueChange: null}
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
        const cubicSpline = fromJson(spline, extractor)
        result = [...result, <SplineCard
            coordinate={spline.coordinate}
            spline={cubicSpline}
            inputLinkList={inputLinkList}
            outputLink={outputLink}
            placePos={{x: placePos.x + INDENT, y: placePos.y + INDENT}}
            setFocused={setFocused}
        />]

        return {elements: result, defaultVal: cubicSpline.compute(minX + (maxX - minX) / 2), height: totHeight}
    }

    const buildResult = useMemo(() => build(data, null, {x: 0, y: 0}), [data])

    function onMouseUp(e: MouseEvent) {
        if (e.button != 0)
            return
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
    }

    function onMouseMove(e: MouseEvent) {
        setOffset(offsetRef.current = {
            x: offsetRef.current.x + e.movementX,
            y: offsetRef.current.y + e.movementY
        })
    }

    const onMouseDown = useCallback((e: MouseEvent) => {
        if (e.button != 0)
            return
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [])

    // TODO solve situation where passed in Json is...just a constant
    return <>
        <div class="controls preview-controls">
            {focused.map(s => <Btn label={s} class="no-pointer"/>)}
            <BtnMenu icon="gear" tooltip={locale('settings')}>
                <Btn icon={showCoordName ? 'square_fill' : 'square'} label={locale('preview.show_coord_name')}
                     onClick={() => setShowCoordName(!showCoordName)}/>
            </BtnMenu>
        </div>
        <div class="full-preview">
            <div class="spline-preview" onMouseDown={onMouseDown}>
                <Offset.Provider value={offset}>
                    <ShowCoordName.Provider value={showCoordName}>
                        {buildResult.elements}
                    </ShowCoordName.Provider>
                </Offset.Provider>
            </div>
        </div>
    </>
}