import {SplineCard} from "../SplineCard.js";
import {PreviewProps} from "./index.js";
import {CubicSpline} from "deepslate";

function extractor() {
    return {
        compute(c: number): number {
            return c
        }
    }
}

function preProcess(data: any){
    const spline = {
    }
    if('coordinate' in data)
        spline.coordinate = data.coordinate
    if(('points' in data) && Array.isArray(data.points)){
        spline.points = []
        for(const point of data.points){
            console.log("point: ", point)
            if('node' in point && 'location' in point.node && 'derivative' in point.node && 'value' in point.node) {
                console.log("pushed", point.node)
                spline.points.push(point.node)
            }
        }
    }
    console.log("preProcess finish")
    console.log(spline)
    return spline
}

export const SplinePreview = ({data}: PreviewProps) => {
    console.log("invoke spline preview")
    console.log(data)

    return <>
        <div class="full-preview">
            <SplineCard spline={CubicSpline.fromJson(preProcess(data), extractor)}/>
        </div>
    </>
}
