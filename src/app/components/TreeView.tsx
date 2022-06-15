import { useMemo, useState } from 'preact/hooks'
import { useFocus } from '../hooks/index.js'
import { Octicon } from './index.js'

const SEPARATOR = '/'

export interface EntryAction {
	icon: keyof typeof Octicon,
	label: string,
	onAction: (entry: string) => unknown,
}

export interface EntryError {
	path: string,
	message: string,
}

interface Props {
	entries: string[],
	onSelect: (entry: string) => unknown,
	selected?: string,
	actions?: EntryAction[],
	errors?: EntryError[],
	indent?: number,
}
export function TreeView({ entries, onSelect, selected, actions, errors, indent }: Props) {
	const roots = useMemo(() => {
		const groups: Record<string, string[]> = {}
		for (const entry of entries) {
			const i = entry.indexOf(SEPARATOR)
			if (i >= 0) {
				const root = entry.slice(0, i)
				;(groups[root] ??= []).push(entry.slice(i + 1))
			}
		}
		return Object.entries(groups).map(([r, entries]) => {
			const rootActions = actions?.map(a => ({ ...a, onAction: (e: string) => a.onAction(r + SEPARATOR + e) }))
			const rootErrors = errors?.flatMap(e => e.path.startsWith(r + SEPARATOR) ? [{ ...e, path: e.path.slice(r.length + SEPARATOR.length) }] : [])
			return [r, entries, rootActions, rootErrors] as [string, string[], EntryAction[], EntryError[]]
		}).sort()
	}, [entries, actions, errors])

	const leaves = useMemo(() => {
		return entries.filter(e => !e.includes(SEPARATOR))
	}, [entries])

	const [hidden, setHidden] = useState(new Set<string>())
	const toggle = (root: string) => {
		if (hidden.has(root)) {
			hidden.delete(root)
		} else {
			hidden.add(root)
		}
		setHidden(new Set(hidden))
	}

	return <div class="tree-view" style={`--indent: ${indent ?? 0};`}>
		{roots.map(([r, entries, actions, errors]) => <div>
			<TreeViewEntry icon={hidden.has(r) ? 'chevron_right' : 'chevron_down'} key={r} label={r} onClick={() => toggle(r)} error={(errors?.length ?? 0) > 0} />
			{!hidden.has(r) &&
				<TreeView entries={entries} onSelect={e => onSelect(`${r}${SEPARATOR}${e}`)}
					selected={selected?.startsWith(r + SEPARATOR) ? selected.substring(r.length + 1) : undefined}
					actions={actions} errors={errors} indent={(indent ?? 0) + 1} />}
		</div>)}
		{leaves.map(e => <TreeViewEntry icon="file" key={e} label={e} active={e === selected} onClick={() => onSelect(e)} actions={actions?.map(a => ({ ...a, onAction: () => a.onAction(e) }))} error={errors?.find(er => er.path === e)?.message} />)}
	</div>
}

interface TreeViewEntryProps {
	icon: keyof typeof Octicon,
	label: string,
	active?: boolean,
	onClick?: () => unknown,
	actions?: EntryAction[],
	error?: string | boolean,
}
function TreeViewEntry({ icon, label, active, onClick, actions, error }: TreeViewEntryProps) {
	const [focused, setFocus] = useFocus()
	const onContextMenu = (evt: MouseEvent) => {
		evt.preventDefault()
		if (actions?.length) {
			setFocus()
		}
	}

	return <div class={`entry${error ? ' has-error' : ''}${active ? ' active' : ''}${focused ? ' focused' : ''}`} onClick={onClick} onContextMenu={onContextMenu} >
		{Octicon[icon]}
		<span>{label.replaceAll('\u2215', '/')}</span>
		{typeof error === 'string' && <div class="status-icon danger tooltipped tip-se" aria-label={error}>
			{Octicon.issue_opened}	
		</div>}
		{focused && <div class="entry-menu">
			{actions?.map(a => <div class="action" onClick={e => { a.onAction(''); e.stopPropagation(); setFocus(false) }}>{Octicon[a.icon]}{a.label}</div>)}
		</div>}
	</div>
}
