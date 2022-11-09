import { useLocale } from '../../contexts/Locale.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchBugfixes } from '../../services/DataFetcher.js'
import type { VersionId } from '../../services/Schemas.js'
import { Issue } from './Issue.jsx'

interface Props {
	version: string
}
export function IssueList({ version }: Props) {
	const { locale } = useLocale()
	const { value: issues, loading } = useAsync(() => fetchBugfixes(version as VersionId), [version])

	return <div class="card-column">
		{issues === undefined || loading ? <>
			<span class="note">{locale('loading')}</span>
		</> : issues.length === 0 ? <>
			<span class="note">{locale('versions.fixes.no_results')}</span>
		</> : <>
			{issues?.map(issue => <Issue key={issue.id} fix={issue} />)}
		</>}
	</div>
}
