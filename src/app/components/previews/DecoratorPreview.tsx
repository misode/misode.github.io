import type { DataModel } from '@mcschema/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Btn } from '..'
import { decorator } from '../../previews'
import type { VersionId } from '../../Schemas'
import { hexId } from '../../Utils'

type DecoratorProps = {
	lang: string,
	model: DataModel,
	data: any,
	version: VersionId,
	shown: boolean,
}
export const DecoratorPreview = ({ data, version, shown }: DecoratorProps) => {
	const [scale, setScale] = useState(4)
	const [seed, setSeed] = useState(hexId())

	const canvas = useRef<HTMLCanvasElement>(null)
	const redraw = useRef<Function>()

	useEffect(() => {
		redraw.current = () => {
			const ctx = canvas.current.getContext('2d')!
			canvas.current.width = scale * 16
			canvas.current.height = scale * 16
			const img = ctx.createImageData(canvas.current.width, canvas.current.height)
			decorator(data, img, { seed, version, size: [scale * 16, 128, scale * 16] })
			ctx.putImageData(img, 0, 0)
		}
	})

	const state = JSON.stringify(data)
	useEffect(() => {
		if (shown) {
			setTimeout(() => redraw.current())
		}
	}, [state, scale, seed, shown])

	return <>
		<div class="controls">
			<Btn icon="dash" onClick={() => setScale(Math.min(16, scale + 1))} />
			<Btn icon="plus" onClick={() => setScale(Math.max(1, scale - 1))} />
			<Btn icon="sync" onClick={() => setSeed(hexId())} />
		</div>
		<canvas ref={canvas} width="64" height="64"></canvas>
	</>
}
