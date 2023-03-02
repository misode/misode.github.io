import {SplineCard, SplineTypeValue, ValueChangeHandler} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline, MinMaxNumberFunction} from "deepslate";
import {createContext, createRef, RefObject} from "preact";
import fromJson = CubicSpline.fromJson;
import {useCallback, useMemo, useRef, useState} from "preact/hooks";
import {pos2n} from "../../Utils.js";

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

// TODO More careful type check, or check if such check is necessary

export const SplinePreview = ({data}: PreviewProps) => {
    console.log("invoke spline preview")

    const [offset, setOffset] = useState({x: 0, y: 0})
    const offsetRef = useRef<pos2n>(offset)
    function build(data: any, valChangeHandlerRef: RefObject<ValueChangeHandler>):
        { elements: JSX.Element[], defaultVal: number } {
        console.log('start building', data)
        let result: JSX.Element[] = []
        if (!checkSpline(data))
            return {elements: result, defaultVal: 0}
        let spline = {}
        spline.coordinate = data.coordinate
        spline.points = []
        let splineTypeValueList: SplineTypeValue[] = []
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
                const ref = createRef<ValueChangeHandler>()
                let cards = build(point.node.value, ref)
                if (cards.elements.length == 0)
                    console.log('cards list is empty!')
                spline.points.push({
                    derivative: point.node.derivative,
                    location: point.node.location,
                    value: cards.elements.length > 0 ? cards.defaultVal : 0
                })
                result = [...result, ...cards.elements]
                splineTypeValueList = [...splineTypeValueList, {index: i, valChangeHandlerRef: ref}]
            }
        }
        const cubicSpline = fromJson(spline, extractor)
        result = [...result, <SplineCard
            coordinate={spline.coordinate}
            id={Math.round(Math.random() * 10000)}
            spline={cubicSpline}
            splineTypeValueList={splineTypeValueList}
            vchRef={valChangeHandlerRef}
        />]

        return {elements: result, defaultVal: cubicSpline.compute(minX + (maxX - minX) / 2)}
    }
    const buildResult = useMemo(() => build(data, createRef()), [data])

    function onMouseUp(e: MouseEvent){
        if(e.button != 0)
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
        if(e.button != 0)
            return
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [])

    // TODO solve situation where passed in Json is...just a constant
    return <>
        <div class="controls preview-controls">
        </div>
        <div class="full-preview">
            <div class="spline-preview" onMouseDown={onMouseDown}>
                <Offset.Provider value={offset}>
                    {buildResult.elements}
                </Offset.Provider>
            </div>
        </div>
    </>
}