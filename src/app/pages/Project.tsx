import { DataModel } from '@mcschema/core'
import { useMemo, useRef, useState } from 'preact/hooks'
import config from '../../config.json'
import { Ad, Btn, BtnLink, TreeView } from '../components'
import type { ProjectFile } from '../contexts'
import { disectFilePath, getFilePath, useLocale, useProject, useTitle } from '../contexts'
import { checkVersion, getSchemas } from '../services'
import { Store } from '../Store'
import { writeZip } from '../Utils'

interface Problem extends ProjectFile {
	message: string,
}

interface Props {
	path?: string,
}
export function Project({}: Props) {
	const { locale } = useLocale()
	const { project, openFile } = useProject()
	useTitle(locale('title.project', project.name))
	const entries = useMemo(() => project.files.flatMap(f => {
		const path = getFilePath(f)
		return path ? [path] : []
	}), project.files)

	const [problems, setProblems] = useState<Problem[]>([])

	const selectFile = (entry: string) => {
		const file = disectFilePath(entry)
		if (file) {
			openFile(file.type, file.id)
		}
	}

	const download = useRef<HTMLAnchorElement>(null)

	const onDownload = async () => {
		if (!download.current) return
		const entries = project.files.map(file => {
			const path = getFilePath(file)
			return [`${path}.json`, JSON.stringify(file.data, null, Store.getIndent())] as [string, string]
		})
		if (project.meta) {
			entries.push(['pack.mcmeta', JSON.stringify(project.meta, null, Store.getIndent())])
		}
		const url = await writeZip(entries)
		download.current.setAttribute('href', url)
		download.current.setAttribute('download', `${project.name.replaceAll(' ', '_')}.zip`)
		download.current.click()
	}

	const onValidate = async () => {
		const version = project.version ?? Store.getVersion()
		const schemas = await getSchemas(version)
		const problems: Problem[] = []
		for (const file of project.files) {
			const gen = config.generators.find(g => g.id === file.type)
			if (!gen) continue
			if (!checkVersion(version, gen.minVersion, gen.maxVersion)) {
				continue
			}
			const model = new DataModel(schemas.get(gen.schema))
			model.reset(file.data)
			for (const e of model.errors) {
				const message = locale(e.error, ...e.params ?? [])
				problems.push({ ...file, message: `${e.path.toString()}: ${message}` })
			}
		}
		setProblems(problems)
		console.log(problems)
	}

	return <main>
		<Ad id="data-pack-project" type="text" />
		<div class="project-navigation">
			<BtnLink icon="plus_circle" label="New project" link="/project/new/" />
			<Btn icon="download" label="Download" onClick={onDownload} />
			<Btn icon="codescan_checkmark" label="Validate" onClick={onValidate} />
		</div>
		<div class="project">
			<h2>{project.name}</h2>
			{problems.length > 0 && <div class="problems">
				{problems.map(p => <div class="problem">
					<span>{getFilePath(p)}</span>
					<span>{p.message}</span>
				</div>)}
			</div>}
			<div class="file-view">
				{entries.length === 0
					? <span>{locale('project.no_files')}</span>
					: <TreeView entries={entries} onSelect={selectFile}
						errors={problems.flatMap(p => {
							const path = getFilePath(p)
							if (path === undefined) return []
							return [{ path, message: p.message }]
						})}/>}
			</div>
		</div>
		<a ref={download} style="display: none;"></a>
	</main>
}
