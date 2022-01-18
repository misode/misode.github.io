import { useMemo, useState } from 'preact/hooks'
import { Btn, BtnInput } from '..'

interface Props {
	values?: string[],
	onSelect?: (value: string) => unknown,
	searchPlaceholder?: string,
	noResults?: string,
}
export function SearchList({ values, onSelect, searchPlaceholder, noResults }: Props) {
	const [search, setSearch] = useState('')
	const results = useMemo(() => {
		const terms = search.trim().split(' ')
		return values?.filter(v => terms.every(t => v.includes(t))) ?? []
	}, [values, search])

	return <>
		<BtnInput icon="search" large value={search} onChange={setSearch} doSelect={1} placeholder={searchPlaceholder ?? 'Search'} />
		<div class="result-list">
			{results.map(v => <Btn key={v} label={v} onClick={() => onSelect?.(v)} />)}
			{results.length === 0 && <Btn label={noResults ?? 'No results'}/>}
		</div>
	</>
}
