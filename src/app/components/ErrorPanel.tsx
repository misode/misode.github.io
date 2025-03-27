import type { ComponentChildren } from 'preact'
import { getCurrentUrl } from 'preact-router'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { useProject } from '../contexts/Project.jsx'
import { useSpyglass } from '../contexts/Spyglass.jsx'
import { useVersion } from '../contexts/Version.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { latestVersion } from '../services/DataFetcher.js'
import { getGenerator, SOURCE_REPO_URL } from '../Utils.js'
import { Octicon } from './index.js'

type ErrorPanelProps = {
	error: string | Error,
	prefix?: string,
	reportable?: boolean,
	onDismiss?: () => unknown,
	body?: string,
	children?: ComponentChildren,
}
export function ErrorPanel({ error, prefix, reportable, onDismiss, body: body_, children }: ErrorPanelProps) {
	const { version } = useVersion()
	const { service } = useSpyglass()
	const { projectUri } = useProject()
	const [stackVisible, setStackVisible] = useState(false)
	const [stack, setStack] = useState<string | undefined>(undefined)

	const name = (prefix ?? '') + (error instanceof Error ? error.message : error)
	const gen = getGenerator(getCurrentUrl())
	const { value: source } = useAsync(async () => {
		if (!service || !gen) {
			return undefined
		}
		const uri = projectUri ?? service.getUnsavedFileUri(gen)
		if (!uri) {
			return undefined
		}
		return await service.readFile(uri)
	}, [service, version, projectUri, gen])

	useEffect(() => {
		if (error instanceof Error) {
			const stack = error.stack!.split('\n').map(line => {
				return line.replace(/^(\s+)at (?:async )?(https?:.*)/, '$1at ($2)')
			})
			setStack(stack.join('\n'))
			import('sourcemapped-stacktrace').then(({ mapStackTrace }) => {
				mapStackTrace(stack.join('\n'), (mapped) => {
					const mappedStack = mapped.map(line => {
						return line.replace(/..\/..\/src\//, 'src/')
					}).join('\n')
					setStack(mappedStack)
				})
			})
		}
	}, [error])

	const url = useMemo(() => {
		let url =`${SOURCE_REPO_URL}/issues/new`
		const fullName = (error instanceof Error ? `${error.name}: ` : '') + name
		url += `?title=${encodeURIComponent(fullName)}`
		let body = ''
		body += `## Crash report\n * Page url: \`${location.href}\`\n`
		if (gen) {
			body += ` * Generator ID: \`${gen.id}\`\n`
		}
		body += ` * Current version: \`${version}\`\n`
		body += ` * Latest version: \`${latestVersion}\`\n`
		if (error instanceof Error && stack) {
			body += `\n### Stack trace\n\`\`\`\n${fullName}\n${stack}\n\`\`\`\n`
		}
		if (source) {
			body += `\n### Generator JSON\n<details>\n<pre>\n${source}\n</pre>\n</details>\n`
		}
		if (body_) {
			body += body_
		}
		url += `&body=${encodeURIComponent(body)}`
		return url
	}, [error, name, body_, version, stack, source, gen?.id])

	return <div class="error">
		{onDismiss && <div class="error-dismiss" onClick={onDismiss}>{Octicon.x}</div>}
		<h3 class="font-bold text-xl !my-[10px]">
			{(prefix ?? '') + (error instanceof Error ? error.message : error)}
			{stack && <span onClick={() => setStackVisible(!stackVisible)}>
				{Octicon.info}
			</span>}
		</h3>
		{stack && stackVisible && <pre>{stack}</pre>}
		{reportable !== false && <p>If you think this is a bug, you can report it <a href={url} target="_blank">on GitHub</a></p>}
		{children}
	</div>
}
