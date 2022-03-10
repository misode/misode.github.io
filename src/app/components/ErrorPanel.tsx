import { useEffect, useMemo, useState } from 'preact/hooks'
import { mapStackTrace } from 'sourcemapped-stacktrace'
import { Octicon } from './Octicon'

type ErrorPanelProps = {
	error: string | Error,
	onDismiss?: () => unknown,
}
export function ErrorPanel({ error, onDismiss }: ErrorPanelProps) {
	const [stackVisible, setStackVisible] = useState(false)
	const [stack, setStack] = useState<string | undefined>(undefined)

	useEffect(() => {
		if (error instanceof Error) {
			const stack = error.stack!.split('\n').map(line => {
				return line.replace(/^(\s+)at (?:async )?(https?:.*)/, '$1at ($2)')
			})
			setStack(stack.join('\n'))
			mapStackTrace(stack.join('\n'), (mapped) => {
				const mappedStack = mapped.map(line => {
					return line.replace(/..\/..\/src\//, 'src/')
				}).join('\n')
				setStack(mappedStack)
			})
		}
	}, [error])

	const url = useMemo(() => {
		let url ='https://github.com/misode/misode.github.io/issues/new'
		if (error instanceof Error) {
			url += `?title=${encodeURIComponent(`${error.name}: ${error.message}`)}`
			if (stack) {
				url += `&body=${encodeURIComponent(`\`\`\`\n${error.name}: ${error.message}\n${stack}\n\`\`\`\n`)}`
			}
		} else {
			url += `?title=${encodeURIComponent(error.toString())}`
		}
		return url
	}, [error, stack])

	return <div class="error">
		{onDismiss && <div class="error-dismiss" onClick={onDismiss}>{Octicon.x}</div>}
		<h3>
			{error instanceof Error ? error.message : error}
			{stack && <span onClick={() => setStackVisible(!stackVisible)}>
				{Octicon.info}
			</span>}
		</h3>
		{stack && stackVisible && <pre>{stack}</pre>}
		<p>If you think this is a bug, you can report it <a href={url} target="_blank">on GitHub</a></p>
	</div>
}
