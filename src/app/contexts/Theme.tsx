import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { Analytics } from '../Analytics'
import { Store } from '../Store'

interface Theme {
	theme: string,
	changeTheme: (theme: string) => unknown,
}
const Theme = createContext<Theme>({
	theme: 'dark',
	changeTheme: () => {},
})

export function useTheme() {
	return useContext(Theme)
}

export function ThemeProvider({ children }: { children: ComponentChildren }) {
	const [theme, setTheme] = useState(Store.getTheme())

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
	}, [theme])

	const changeTheme = useCallback((theme: string) => {
		Analytics.setTheme(theme)
		Store.setTheme(theme)
		setTheme(theme)
	}, [])

	const value: Theme = {
		theme,
		changeTheme,
	}

	return <Theme.Provider value={value}>
		{children}
	</Theme.Provider>
}
