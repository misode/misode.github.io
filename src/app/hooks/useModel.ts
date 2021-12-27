import type { DataModel } from '@mcschema/core'
import type { Inputs } from 'preact/hooks'
import { useEffect } from 'preact/hooks'

export function useModel(model: DataModel | undefined | null, invalidated: (model: DataModel) => unknown, inputs: Inputs = []) {
	const listener = {
		invalidated() {
			if (model) {
				invalidated(model)
			}
		},
	}

	useEffect(() => {
		model?.addListener(listener)
		return () => {
			model?.removeListener(listener)
		}
	}, [model, ...inputs])
}
