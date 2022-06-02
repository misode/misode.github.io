import { useMemo, useState } from 'preact/hooks'
import { Octicon } from '.'

const SEPARATOR = '/'

interface EntryError {
	path: string,
	message: string,
}

interface Props {
	entries: string[],
	onSelect: (entry: string) => unknown,
	selected?: string,
	errors?: EntryError[],
	indent?: number,
}
export function TreeView({ entries, onSelect, selected, errors, indent }: Props) {
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
			const rootErrors = errors?.flatMap(e => e.path.startsWith(r + SEPARATOR) ? [{ ...e, path: e.path.slice(r.length + SEPARATOR.length) }] : [])
			return [r, entries, rootErrors] as [string, string[], EntryError[]]
		}).sort()
	}, [entries, errors])

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
		{roots.map(([r, entries, errors]) => <div>
			<TreeViewEntry icon={hidden.has(r) ? 'chevron_right' : 'chevron_down'} key={r} label={r} onClick={() => toggle(r)} error={(errors?.length ?? 0) > 0} />
			{!hidden.has(r) &&
				<TreeView entries={entries} onSelect={e => onSelect(`${r}${SEPARATOR}${e}`)}
					selected={selected?.startsWith(r + SEPARATOR) ? selected.substring(r.length + 1) : undefined}
					errors={errors} indent={(indent ?? 0) + 1} />}
		</div>)}
		{leaves.map(e => <TreeViewEntry icon="file" key={e} label={e} active={e === selected} onClick={() => onSelect(e)} error={errors?.find(er => er.path === e)?.message} />)}
	</div>
}

interface TreeViewEntryProps {
	icon: keyof typeof Octicon,
	label: string,
	active?: boolean,
	onClick?: () => unknown,
	error?: string | boolean,
}
function TreeViewEntry({ icon, label, active, onClick, error }: TreeViewEntryProps) {
	return <div class={`entry${error ? ' has-error' : ''}${active ? ' active' : ''}`} onClick={onClick} >
		{Octicon[icon]}
		<span>{label}</span>
		{typeof error === 'string' && <div class="status-icon danger tooltipped tip-se" aria-label={error}>
			{Octicon.issue_opened}	
		</div>}
	</div>
}
