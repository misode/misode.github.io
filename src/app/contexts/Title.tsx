import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { useLocale } from '.'
import config from '../../config.json'
import type { VersionId } from '../services'

const VERSIONS_IN_TITLE = 3

interface Title {
	title: string,
	changeTitle: (title: string, versions?: VersionId[], suffix?: string) => unknown,
}
const Title = createContext<Title>({
	title: '',
	changeTitle: () => {},
})

export function useTitle(title?: string, versions?: VersionId[], suffix?: string) {
	const context = useContext(Title)
	useEffect(() => {
		if (title) {
			context.changeTitle(title, versions, suffix)
		}
	}, [title, versions, suffix])
	return context
}

export function TitleProvider({ children }: { children: ComponentChildren }) {
	const { locale } = useLocale()
	const [title, setTitle] = useState<string>(locale('title.home'))

	const changeTitle = useCallback((title: string, versionIds?: VersionId[], suffix?: string) => {
		let versions = config.versions
		if (versionIds !== undefined) {
			versions = config.versions.filter(v => versionIds?.includes(v.id as VersionId))
		}
		let titleSuffix = ''
		if (suffix) {
			titleSuffix = ` - ${suffix}`
		}
		if (!(versionIds?.length === 0)) {
			const titleVersions = versions.map(v => v.id).slice(-VERSIONS_IN_TITLE)
			titleSuffix = ` - Minecraft ${titleVersions.join(', ')}`
		}
		document.title = title + titleSuffix
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
