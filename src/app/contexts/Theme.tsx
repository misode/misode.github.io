import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { Analytics } from '../Analytics.js'
import { useMediaQuery } from '../hooks/index.js'
import { Store } from '../Store.js'

interface Theme {
	theme: string,
	actualTheme: 'light' | 'dark',
	changeTheme: (theme: string) => unknown,
}
const Theme = createContext<Theme>({
	theme: 'dark',
	actualTheme: 'dark',
	changeTheme: () => {},
})

export function useTheme() {
	return useContext(Theme)
}

export function ThemeProvider({ children }: { children: ComponentChildren }) {
	const [theme, setTheme] = useState(Store.getTheme())
	const prefersLight = useMediaQuery('(prefers-color-scheme: light)')
	const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
	}, [theme])

	const changeTheme = useCallback((newTheme: string) => {
		Analytics.changeTheme(theme, newTheme)
		Store.setTheme(newTheme)
		setTheme(newTheme)
	}, [theme])

	useEffect(() => {
		Analytics.setPrefersColorScheme(prefersLight ? 'light' : prefersDark ? 'dark' : 'none')
	}, [prefersLight, prefersDark])

	useEffect(() => {
		Analytics.setTheme(theme)
	}, [])

	const value: Theme = {
		theme,
		actualTheme: theme === 'light' || (theme !== 'dark' && prefersLight) ? 'light' : 'dark',
		changeTheme,
	}

	return <Theme.Provider value={value}>
		{children}
	</Theme.Provider>
}
