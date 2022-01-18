import { useMemo, useState } from 'preact/hooks'
import { Octicon } from '.'

const SEPARATOR = '/'

interface Props {
	entries: string[],
	onSelect: (entry: string) => unknown,
	indent?: number,
}
export function TreeView({ entries, onSelect, indent }: Props) {
	const roots = useMemo(() => {
		const groups: Record<string, string[]> = {}
		for (const entry of entries) {
			const i = entry.indexOf(SEPARATOR)
			if (i >= 0) {
				const root = entry.slice(0, i)
				;(groups[root] ??= []).push(entry.slice(i + 1))
			}
		}
		return Object.entries(groups)
	}, entries)

	const leaves = useMemo(() => {
		return entries.filter(e => !e.includes(SEPARATOR))
	}, entries)

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
		{roots.map(([r, entries]) => <div>
			<TreeViewEntry icon={hidden.has(r) ? 'chevron_right' : 'chevron_down'} key={r} label={r} onClick={() => toggle(r)}/>
			{!hidden.has(r) &&
				<TreeView entries={entries} onSelect={e => onSelect(`${r}/${e}`)} indent={(indent ?? 0) + 1} />}
		</div>)}
		{leaves.map(e => <TreeViewEntry icon="file" key={e} label={e} onClick={() => onSelect(e)} />)}
	</div>
}

interface TreeViewEntryProps {
	icon: keyof typeof Octicon,
	label: string,
	onClick?: () => unknown,
}
function TreeViewEntry({ icon, label, onClick }: TreeViewEntryProps) {
	return <div class="entry" onClick={onClick} >
		{Octicon[icon]}
		{label}
	</div>
}
