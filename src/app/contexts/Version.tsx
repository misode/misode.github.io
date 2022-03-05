import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { getCurrentUrl } from 'preact-router'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { Analytics } from '../Analytics'
import type { VersionId } from '../services'
import { VersionIds } from '../services'
import { Store } from '../Store'
import { getSearchParams, setSeachParams } from '../Utils'

const VERSION_PARAM = 'version'

interface Version {
	version: VersionId,
	changeVersion: (version: VersionId) => unknown,
}
const Version = createContext<Version>({
	version: '1.18.2',
	changeVersion: () => {},
})

export function useVersion() {
	return useContext(Version)
}

export function VersionProvider({ children }: { children: ComponentChildren }) {
	const [version, setVersion] = useState<VersionId>(Store.getVersion())

	const searchParams = getSearchParams(getCurrentUrl())
	const targetVersion = searchParams.get(VERSION_PARAM)
	useEffect(() => {
		if (VersionIds.includes(targetVersion as VersionId) && version !== targetVersion) {
			setVersion(targetVersion as VersionId)
		}
	}, [version, targetVersion])

	const changeVersion = useCallback((version: VersionId) => {
		if (getSearchParams(getCurrentUrl()).has(VERSION_PARAM)) {
			setSeachParams({ version })
		}
		Analytics.setVersion(version)
		Store.setVersion(version)
		setVersion(version)
	}, [])

	const value: Version = {
		version,
		changeVersion,
	}

	return <Version.Provider value={value}>
		{children}
	</Version.Provider>
}
