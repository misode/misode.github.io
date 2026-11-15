import { useMemo } from 'preact/hooks'
import supporters from '../../supporters.json'
import { BtnLink, Card, ChangelogEntry, Footer, GeneratorList, Giscus, ToolCard, ToolGroup } from '../components/index.js'
import { WhatsNewTime } from '../components/whatsnew/WhatsNewTime.jsx'
import { useLocale, useTitle } from '../contexts/index.js'
import { useAsync } from '../hooks/useAsync.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { fetchChangelogs, fetchVersions, fetchWhatsNew } from '../services/DataFetcher.js'

interface Props {
	path?: string,
}
export function Home({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.home'))

	return <main>
		<div class="grid gap-4 p-4 max-w-[960px] mx-auto">
			<GeneratorList limit={8} predicate={gen => !gen.tags?.includes('partners')} extra={<>
				<BtnLink icon="link_external" label={locale('modded')} link="/partners/" />
			</>} />
			<div class="grid md:grid-cols-2 gap-2">
				<div class="flex flex-col gap-2">
					<Versions />
					<Changelog />
				</div>
				<div class="flex flex-col gap-2">
					<Tools />
					<WhatsNew />
				</div>
			</div>
			<Supporters />
			<Giscus />
			<Footer />
		</div>
	</main>
}

function Tools() {
	const { locale } = useLocale()

	return <ToolGroup title={locale('tools')}>
		<ToolCard title="Converter" icon="convert"
			link="/convert/"
			desc="Turn /give commands into loot tables" />
		<ToolCard title="Customized Worlds" icon="customized"
			link="/customized/"
			desc="Create data packs to customize your world" />
		<ToolCard title="Report Inspector" icon="report"
			link="https://misode.github.io/report/"
			desc="Analyse your performance reports" />
		<ToolCard title="Minecraft Sounds" icon="sound_explorer"
			link="/sounds/"
			desc="Browse through and mix all the vanilla sounds" />
		<ToolCard title="Transformation preview"
			link="/transformation/"
			desc="Visualize transformations for display entities" />
		<ToolCard title="Template Placer"
			link="https://misode.github.io/template-placer/"
			desc="Automatically place all the structure pieces in your world" />
	</ToolGroup>
}

function Versions() {
	const { locale } = useLocale()

	const { value: versions } = useAsync(fetchVersions, [])
	const release = useMemo(() => versions?.find(v => v.type === 'release'), [versions])

	return <ToolGroup title={locale('versions.minecraft_versions')} link="/versions/" titleIcon="arrow_right">
		{(versions?.[0] && release) && <>
			{versions[0].id !== release.id && (
				<ToolCard title={versions[0].name} link={`/versions/?id=${versions[0].id}`} desc={locale('versions.latest_snapshot')} />
			)}
			<ToolCard title={release.name} link={`/versions/?id=${release.id}`} desc={locale('versions.latest_release')} />
		</>}
	</ToolGroup>
}

function Changelog() {
	const { locale } = useLocale()

	const hugeScreen = useMediaQuery('(min-width: 960px)')

	const { value: changes } = useAsync(fetchChangelogs, [])
	const latestChanges = useMemo(() => {
		return changes
			?.sort((a, b) => b.order - a.order)
			.filter(c => !(c.tags.includes('pack') && c.tags.includes('breaking')))
			.slice(0, 2)
	}, [changes])

	return <ToolGroup title={locale('changelog')} link="/changelog/" titleIcon="git_commit">
		{latestChanges?.map(change => <ChangelogEntry minimal={!hugeScreen} short={true} change={change} />)}
	</ToolGroup>
}

function WhatsNew() {
	const { locale } = useLocale()

	const { value: items } = useAsync(fetchWhatsNew)

	return <ToolGroup title={locale('whats_new')} link="/whats-new/" titleIcon="megaphone">
		{items?.slice(0, 3).map(item => <Card link="/whats-new/" overlay={<WhatsNewTime item={item} short={true} />}>{item.title}</Card>)}
	</ToolGroup>
}

function Supporters() {
	return <div class="contributors">
		<h3>Supporters</h3>
		<div class="contributors-list">
			{supporters.map((s) =>
				<a class="tooltipped tip-se" href={s.url} target="_blank" aria-label={s.name}>
					<img width="48" height="48" src={s.avatar} alt={s.name} loading="lazy" />
				</a>
			)}
		</div>
	</div>
}
