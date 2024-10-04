import { createPatch } from 'diff'
import { useCallback, useEffect, useRef } from 'preact/hooks'
import { useLocale } from '../../contexts/Locale.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'
import { useSearchParam } from '../../hooks/useSearchParam.js'
import type { GitHubCommitFile } from '../../services/DataFetcher.js'
import { fetchVersionDiff } from '../../services/DataFetcher.js'
import { parseGitPatch } from '../../Utils.js'
import { ErrorPanel } from '../ErrorPanel.jsx'
import { Octicon } from '../Octicon.jsx'
import type { TreeViewGroupRenderer, TreeViewLeafRenderer } from '../TreeView.jsx'
import { TreeView } from '../TreeView.jsx'

const mcmetaRawUrl = 'https://raw.githubusercontent.com/misode/mcmeta'
const mcmetaBlobUrl = 'https://github.com/misode/mcmeta/blob'

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

	const { value, loading } = useAsync(async () => {
		if (filename === undefined) return { file: undefined, diff: undefined }
		const file = commit?.files.find(f => f.filename === filename)
		if (file === undefined) return { file, diff: undefined }
		let patch = file.patch
		if (patch === undefined) {
			const isMedia = filename.match(/\.(png|ogg)$/)
			const isText = filename.match(/\.(txt|json|mcmeta|snbt|vsh|fsh)$/)
			if (isMedia) {
				return {
					file,
					diff: {
						type: isMedia[1],
						before: file.status === 'added' ? undefined : `${mcmetaRawUrl}/${commit?.parents[0].sha}/${filename}`,
						after: file.status === 'removed' ? undefined : `${mcmetaRawUrl}/${version}-diff/${filename}`,
					},
				}
			} else if (file.status === 'renamed') {
				return { file, diff: [] }
			} else if (isText) {
				const [beforeStr, afterStr] = await Promise.all([
					fetch(`${mcmetaRawUrl}/${commit?.parents[0].sha}/${filename}`).then(r => r.ok ? r.text() : ''),
					fetch(`${mcmetaRawUrl}/${version}-diff/${filename}`).then(r => r.ok ? r.text() : ''),
				])
				patch = createPatch(filename, beforeStr, afterStr)
			}
		}
		if (patch === undefined) {
			return { file, diff: new Error('Cannot display diff for this file') }
		}
		try {
			return { file, diff: parseGitPatch(patch) }
		} catch (e) {
			const error = e as Error
			error.message = `Failed to show diff: ${error.message}`
			return { file, diff: error }
		}
	}, [filename, commit])
	const { file, diff } = value ?? {}

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
			{Array.isArray(diff) && <label class={`ml-2 whitespace-nowrap ${filename ? 'block' : 'hidden md:block'}`}>
				<input type="checkbox" checked={wrap} onClick={() => setWrap(!wrap)} />
				<span class="ml-2">{locale('version_diff.word_wrap')}</span>
			</label>}
		</div>
		<div ref={diffView} class="w-full">
			<div class={`diff-tree w-full md:w-64 md:overflow-y-scroll md:overscroll-contain md:sticky md:top-[56px] ${filename ? 'hidden md:block' : 'block'}`}>
				<TreeView entries={commit?.files ?? []} group={DiffFolder} leaf={DiffEntry} split={file => file.filename.split('/')} />
			</div>
			{filename && <div key={filename} class={'diff-view-panel flex-1 min-w-0 md:pl-2 md:ml-64'}>
				<div class="flex justify-center items-center min-w-0 text-center py-2" title={filename}>
					<span class="mr-2 min-w-0 overflow-hidden text-ellipsis font-bold text-xl">{filename}</span>
					<a class="diff-toggle p-1" href={`${mcmetaBlobUrl}/${version}-diff/${filename}`} target="_blank">{Octicon.link_external}</a>
				</div>
				{(diff === undefined || loading) ? (
					<span class="note">{locale('loading')}</span>
				)	: diff instanceof Error ? (
					<ErrorPanel error={diff} />
				) : !Array.isArray(diff) ? (
					<div class="flex justify-center items-start px-8">
						{diff.before ? (
							diff.type === 'png'
								? <img class="diff-media diff-media-removed w-full min-w-0" src={diff.before} alt="Before image" />
								: <audio class="w-full" controls src={diff.before} />
						) : (
							<div class="diff-media-removed w-full self-stretch flex justify-center items-center">{Octicon.circle_slash}</div>
						)}
						<div class="p-2"></div>
						{diff.after ? (
							diff.type === 'png'
								? <img class="diff-media diff-media-added w-full min-w-0" src={diff.after} alt="After image" />
								: <audio class="w-full" controls src={diff.after} />
						) : (
							<div class="diff-media-added w-full self-stretch flex justify-center items-center">{Octicon.circle_slash}</div>
						)}
					</div>
				) : <>
					{file?.previous_filename !== undefined && <div class="flex justify-center font-mono flex-wrap" title={`${file.previous_filename} → ${filename}`}>
						<span class="overflow-hidden text-ellipsis mr-2">{file.previous_filename}</span>
						<span class="overflow-hidden text-ellipsis whitespace-nowrap"><span class="select-none">→ </span>{filename}</span>
					</div>}
					<div class={`diff-view text-sm ${wrap ? '' : 'overflow-x-auto'}`}>
						<table class="max-w-full w-full">
							{diff.map(line => <tr class={`w-full font-mono ${wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} ${line.before ? (line.after ? '' : 'diff-line-removed') : (line.after ? 'diff-line-added' : 'diff-line-separation')}`}>
								<td class={`diff-number ${line.before || line.after ? 'align-top' : ''} select-none px-2`}>{line.before ?? (line.after ? '' : '...')}</td>
								<td class={`diff-number ${line.before || line.after ? 'align-top' : ''} select-none px-2`}>{line.after ?? (line.before ? '' : '...')}</td>
								<td class="px-2 align-top w-4 select-none">{line.line.startsWith('@') ? '' : line.line.charAt(0)}</td>
								<td class={`break-all w-full ${line.before || line.after ? '' : 'py-2'}`}>{line.line.startsWith('@') ? line.line : line.line.slice(1)}</td>
							</tr>)}
						</table>
					</div>
				</>}
			</div>}
		</div>
	</>
}
