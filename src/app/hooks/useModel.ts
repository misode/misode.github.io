import type { DataModel } from '@mcschema/core'
import { useEffect } from 'preact/hooks'

export function useModel(model: DataModel | undefined | null, invalidated: (model: DataModel) => unknown) {
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
	}, [model])
}
