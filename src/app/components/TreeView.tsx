import { useMemo, useState } from 'preact/hooks'

export type TreeViewGroupRenderer = (props: { name: string, open: boolean, onClick: () => void }) => JSX.Element
export type TreeViewLeafRenderer<E> = (props: { entry: E }) => JSX.Element

interface Props<E> {
	entries: E[],
	split: (entry: E) => string[],
	group: TreeViewGroupRenderer,
	leaf: TreeViewLeafRenderer<E>,
	level?: number,
}

export function TreeView<E>({ entries, split, group: Group, leaf: Leaf, level = 0 }: Props<E>) {
	const roots = useMemo(() => {
		const groups: Record<string, E[]> = {}
		for (const entry of entries) {
			const path = split(entry)
			if (path[level + 1] !== undefined) {
				;(groups[path[level]] ??= []).push(entry)
			}
		}
		return groups
	}, [entries, split, level])

	const leaves = useMemo(() => {
		return entries.filter(e => split(e).length === level + 1)
	}, [entries, split, level])

	const [hidden, setHidden] = useState(new Set<string>())
	const toggle = (root: string) => {
		if (hidden.has(root)) {
			hidden.delete(root)
		} else {
			hidden.add(root)
		}
		setHidden(new Set(hidden))
	}

	return <div class="tree-view" style={`--indent: ${level};`}>
		{Object.entries(roots).map(([r, childs]) => <>
			<Group name={r} open={!hidden.has(r)} onClick={() => toggle(r)} />
			{!hidden.has(r) &&
				<TreeView<E> entries={childs} split={split} group={Group} leaf={Leaf} level={level + 1} />}
		</>)}
		{leaves.map(e => <Leaf key={split(e).join('/')} entry={e} />)}
	</div>
}
