import { useCallback, useEffect, useMemo, useRef } from "preact/hooks"
import { parseGitPatch } from "../../Utils.js"
import { useLocale } from "../../contexts/Locale.jsx"
import { useAsync } from "../../hooks/useAsync.js"
import { useLocalStorage } from "../../hooks/useLocalStorage.js"
import { useSearchParam } from "../../hooks/useSearchParam.js"
import { GitHubCommitFile, fetchVersionDiff } from "../../services/DataFetcher.js"
import { ErrorPanel } from "../ErrorPanel.jsx"
import { Octicon } from "../Octicon.jsx"
import { TreeView, TreeViewGroupRenderer, TreeViewLeafRenderer } from "../TreeView.jsx"

interface Props {
	version: string,
}
export function VersionDiff({ version }: Props) {
	const { locale } = useLocale()
	const { value: commit } = useAsync(() => fetchVersionDiff(version), [version])

	const diffView = useRef<HTMLDivElement>(null)

	const [filename, setFilename] = useSearchParam('file')
	const selectFile = useCallback((filename: string) => {
		setFilename(filename)
		if (diffView.current) {
			const y = diffView.current.getBoundingClientRect().top + window.scrollY - 56
			window.scrollTo({ top: y, behavior: 'smooth' })
		}
	}, [diffView, setFilename])

	const diff = useMemo(() => {
		if (filename === undefined) return undefined
		const file = commit?.files.find(f => f.filename === filename)
		if (file === undefined) return undefined
		if (file.patch === undefined) return []
		try {
			return parseGitPatch(file.patch)
		} catch (e) {
			const error = e as Error
			error.message = `Failed to show diff: ${error.message}`
			return error
		}
	}, [filename, commit])

	const DiffFolder: TreeViewGroupRenderer = useCallback(({ name, open, onClick }) => {
		return <div class="diff-entry select-none" onClick={onClick} >
			{Octicon[!open ? 'chevron_right' : 'chevron_down']}
			<span class="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
		</div>
	}, [])

	const DiffEntry: TreeViewLeafRenderer<GitHubCommitFile> = useCallback(({ entry }) => {
		return <div class={`diff-entry py-0.5 flex items-center [&>svg]:shrink-0 select-none ${entry.filename === filename ? 'active' : ''}`} onClick={() => selectFile(entry.filename)} title={entry.filename}>
			<span class="ml-[15px] mx-2 overflow-hidden text-ellipsis whitespace-nowrap">{entry.filename.split('/').at(-1)}</span>
			<span class={`ml-auto diff-${entry.status}`}>{Octicon[`diff_${entry.status}`]}</span>
	</div>
	}, [filename])

	useEffect(() => {
		if (commit === undefined || filename === undefined) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				const fileIndex = commit.files.findIndex(f => f.filename === filename)
				const newFileIndex = fileIndex + (e.key === 'ArrowDown' ? 1 : -1)
				if (newFileIndex >= 0 && newFileIndex < commit.files.length) {
					selectFile(commit.files[newFileIndex].filename)
				}
				e.preventDefault()
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [commit, filename, selectFile])

	const [wrap, setWrap] = useLocalStorage('misode_diff_word_wrap', true, (s) => s === 'true', (b) => b ? 'true' : 'false')

	return <>
		<div class="diff-header flex items-center z-10 py-2 sticky top-[56px] md:static">
			<button class={`diff-toggle mr-2 ${filename ? 'block md:hidden' : 'hidden'}`} onClick={() => setFilename(undefined)}>{Octicon.arrow_left}</button>
			<p class="note">Showing <b>{commit?.files.length} changed files</b> with <b>{commit?.stats.additions} additions</b> and <b>{commit?.stats.deletions} deletions</b></p>
			<div class="flex-1"></div>
			<label class={`ml-2 whitespace-nowrap ${filename ? 'block' : 'hidden md:block'}`}>
				<input type="checkbox" checked={wrap} onClick={() => setWrap(!wrap)} />
				<span class="ml-2">Word wrap</span>
			</label>
		</div>
		<div ref={diffView} class="w-full">
			<div class={`diff-tree w-full md:w-64 md:overflow-y-scroll md:overscroll-contain md:sticky md:top-[56px] ${filename ? 'hidden md:block' : 'block'}`}>
				<TreeView entries={commit?.files ?? []} group={DiffFolder} leaf={DiffEntry} split={file => file.filename.split('/')} />
			</div>
			{filename && <div class={`diff-view-panel flex-1 min-w-0 md:pl-2 md:ml-64`}>
				<div class="font-bold text-xl text-center p-2 overflow-hidden text-ellipsis" title={filename}>{filename}</div>
				{diff === undefined ? (
					<span class="note">{locale('loading')}</span>
				)	: diff instanceof Error ? (
					<ErrorPanel error={diff} />
				) : <div class={`diff-view text-sm ${wrap ? '' : 'overflow-x-auto'}`}>
					<table class="max-w-full w-full">
						{diff.map(line => <tr class={`w-full font-mono ${wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} ${line.before ? (line.after ? '' : 'diff-line-removed') : (line.after ? 'diff-line-added' : 'diff-line-separation')}`}>
							<td class={`diff-number ${line.before || line.after ? 'align-top' : ''} select-none px-2`}>{line.before ?? (line.after ? '' : '...')}</td>
							<td class={`diff-number ${line.before || line.after ? 'align-top' : ''} select-none px-2`}>{line.after ?? (line.before ? '' : '...')}</td>
							<td class="px-2 align-top w-4 select-none">{line.line.startsWith('@') ? '' : line.line.charAt(0)}</td>
							<td class={`break-all w-full ${line.before || line.after ? '' : 'py-2'}`}>{line.line.startsWith('@') ? line.line : line.line.slice(1)}</td>
						</tr>)}
					</table>
				</div>}
			</div>}
		</div>
	</>
}
