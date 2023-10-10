import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { Analytics } from '../Analytics.js'
import { Store } from '../Store.js'
import { useMediaQuery } from '../hooks/index.js'

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

	const changeTheme = useCallback((newTheme: string) => {
		Analytics.changeTheme(theme, newTheme)
		Store.setTheme(newTheme)
		setTheme(newTheme)
	}, [theme])

	useEffect(() => {
		Analytics.setPrefersColorScheme(prefersLight ? 'light' : prefersDark ? 'dark' : 'none')
	}, [prefersLight, prefersDark])

	const actualTheme = useMemo(() => {
		return theme === 'light' || (theme !== 'dark' && prefersLight) ? 'light' : 'dark'
	}, [theme, prefersLight])

	useEffect(() => {
		document.documentElement.classList.toggle('dark', actualTheme === 'dark')
	}, [actualTheme])

	const value: Theme = {
		theme,
		actualTheme,
		changeTheme,
	}

	return <Theme.Provider value={value}>
		{children}
	</Theme.Provider>
}
