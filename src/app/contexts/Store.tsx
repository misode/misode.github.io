import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext } from 'preact/hooks'
import { useLocalStorage } from '../hooks/index.js'
import type { Color } from '../Utils.js'

interface Store {
	biomeColors: Record<string, [number, number, number]>
	setBiomeColor: (biome: string, color: Color) => void
}

const Store = createContext<Store>({
	biomeColors: {},
	setBiomeColor: () => {},
})

export function useStore() {
	return useContext(Store)
}

export function StoreProvider({ children }: { children: ComponentChildren }) {
	const [biomeColors, setBiomeColors] = useLocalStorage<Record<string, Color>>('misode_biome_colors', {}, JSON.parse, JSON.stringify)

	const setBiomeColor = useCallback((biome: string, color: Color) => {
		setBiomeColors({...biomeColors, [biome]: color })
	}, [biomeColors])

	const value: Store = {
		biomeColors,
		setBiomeColor,
	}

	return <Store.Provider value={value}>
		{children}
	</Store.Provider>
}
