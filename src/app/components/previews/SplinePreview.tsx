import {SplineCard} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline, MinMaxNumberFunction} from "deepslate";
import {useRef} from "preact/hooks";

function extractor(): MinMaxNumberFunction<number> {
    return {
        compute(c: number): number {
            return c
        },
        minValue(): number {
            return -2
        },
        maxValue(): number {
            return 2
        }
    }
}

function preProcess(data: any){
    const spline = {
        coordinate: undefined,
        points: []
    }
    if('coordinate' in data)
        spline.coordinate = data.coordinate
    if(('points' in data) && Array.isArray(data.points)){
        for(const point of data.points){
            if('node' in point && 'location' in point.node && 'derivative' in point.node && 'value' in point.node) {
                spline.points.push(point.node)
            }
        }
    }
    return spline
}

export const SplinePreview = ({data}: PreviewProps) => {
    console.log("invoke spline preview")
    console.log(data)

    // TODO solve situation where passed in Json is...just a constant
    return <>
        <div class="controls preview-controls">
        </div>
        <div class="full-preview">
            <div class="spline-preview">
                <SplineCard spline={CubicSpline.fromJson(preProcess(data), extractor)} splineRef={useRef(null)}/>
            </div>
        </div>
    </>
}
