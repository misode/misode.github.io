import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { useLocale } from '.'
import config from '../../config.json'
import type { VersionId } from '../services'

const VERSIONS_IN_TITLE = 3

interface Title {
	title: string,
	changeTitle: (title: string, versions?: VersionId[]) => unknown,
}
const Title = createContext<Title>({
	title: '',
	changeTitle: () => {},
})

export function useTitle(title?: string, versions?: VersionId[]) {
	const context = useContext(Title)
	useEffect(() => {
		if (title) {
			context.changeTitle(title, versions)
		}
	}, [title, versions])
	return context
}

export function TitleProvider({ children }: { children: ComponentChildren }) {
	const { locale } = useLocale()
	const [title, setTitle] = useState<string>(locale('title.home'))

	const changeTitle = useCallback((title: string, versions?: VersionId[]) => {
		versions ??= config.versions.map(v => v.id as VersionId)
		const titleVersions = versions.slice(-VERSIONS_IN_TITLE)
		document.title = `${title} Minecraft ${titleVersions.join(', ')}`
		setTitle(title)
	}, [])

	const value = {
		title,
		changeTitle,
	}

	return <Title.Provider value={value}>
		{children}
	</Title.Provider>
}
