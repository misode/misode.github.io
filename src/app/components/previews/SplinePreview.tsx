import {SplineCard} from "../SplineCard.js";
import {PreviewProps} from "./index.js";

export const SplinePreview = ({}: PreviewProps) => {
	console.log("invoke spline preview")
	return <>
		<div class="full-preview">
			<SplineCard/>
		</div>
	</>
}
