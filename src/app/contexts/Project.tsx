import { Identifier } from 'deepslate'
import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useState } from 'preact/hooks'
import type { ProjectData } from '../components/previews/Deepslate.js'
import config from '../Config.js'
import { useAsync } from '../hooks/useAsync.js'
import type { VersionId } from '../services/index.js'
import { DEFAULT_VERSION } from '../services/index.js'
import { DRAFTS_URI, PROJECTS_URI, SpyglassClient } from '../services/Spyglass.js'
import { Store } from '../Store.js'
import { genPath, hexId, message, safeJsonParse } from '../Utils.js'

export type ProjectMeta = {
	name: string,
	namespace?: string,
	version?: VersionId,
	storage?: ProjectStorage,
	/** @deprecated */
	files?: ProjectFile[],
	/** @deprecated */
	unknownFiles?: UnknownFile[],
}

export type ProjectStorage = {
	type: 'indexeddb',
	rootUri: string,
}

type ProjectFile = {
	type: string,
	id: string,
	data: any,
}

type UnknownFile = {
	path: string,
	data: string,
}

export const DRAFT_PROJECT: ProjectMeta = {
	name: 'Drafts',
	namespace: 'draft',
	storage: {
		type: 'indexeddb',
		rootUri: DRAFTS_URI,
	},
}

interface ProjectContext {
	projects: ProjectMeta[],
	project: ProjectMeta | undefined,
	projectUri: string | undefined,
	setProjectUri: (uri: string | undefined) => void,
	createProject: (project: ProjectMeta) => void,
	deleteProject: (name: string) => void,
	changeProject: (name: string) => void,
	updateProject: (project: Partial<ProjectMeta>) => void,
}
const Project = createContext<ProjectContext | undefined>(undefined)

export function useProject() {
	const context = useContext(Project)
	if (context === undefined) {
		throw new Error('Cannot use project outside of provider')
	}
	return context
}

export function ProjectProvider({ children }: { children: ComponentChildren }) {
	const [projects, setProjects] = useState<ProjectMeta[]>(Store.getProjects())
	const [openProject, setOpenProject] = useState<string>(Store.getOpenProject())

	const { value: project } = useAsync(async () => {
		const project = projects.find(p => p.name === openProject)
		if (!project) {
			if (openProject !== undefined && openProject !== DRAFT_PROJECT.name) {
				console.warn(`Cannot find project ${openProject} to open`)
			}
			return DRAFT_PROJECT
		}
		if (project.storage === undefined) {
			try {
				const projectRoot = project.name === DRAFT_PROJECT.name ? DRAFTS_URI : `${PROJECTS_URI}${hexId()}/`
				console.log(`Upgrading project ${openProject} to IndexedDB at ${projectRoot}`)
				await SpyglassClient.FS.mkdir(projectRoot)
				if (project.files) {
					await Promise.all(project.files.map(async file => {
						const gen = config.generators.find(g => g.id === file.type)
						if (!gen) {
							console.warn(`Could not upgrade file ${file.id} of type ${file.type}, no generator found!`)
							return
						}
						const type = genPath(gen, project.version ?? DEFAULT_VERSION)
						const { namespace, path } = Identifier.parse(file.id)
						const uri = type === 'pack_mcmeta'
							?	`${projectRoot}data/pack.mcmeta`
							: `${projectRoot}data/${namespace}/${type}/${path}${gen.ext ?? '.json'}`
						return SpyglassClient.FS.writeFile(uri, JSON.stringify(file.data, null, 2))
					}))
				}
				if (project.unknownFiles) {
					await Promise.all(project.unknownFiles.map(async file => {
						const uri = projectRoot + file.path
						return SpyglassClient.FS.writeFile(uri, file.data)
					}))
				}
				const newProject: ProjectMeta = { ...project, storage: { type: 'indexeddb', rootUri: projectRoot } }
				changeProjects(projects.map(p => p === project ? newProject : p))
				return newProject
			} catch (e) {
				console.error(`Something went wrong upgrading project ${openProject}: ${message(e)}`)
				setOpenProject(DRAFT_PROJECT.name)
				return DRAFT_PROJECT
			}
		}
		return project
	}, [projects, openProject])

	const [projectUri, setProjectUri] = useState<string>()

	const changeProjects = useCallback((projects: ProjectMeta[]) => {
		Store.setProjects(projects)
		setProjects(projects)
	}, [])

	const createProject = useCallback((project: ProjectMeta) => {
		changeProjects([...projects, project])
	}, [projects])

	const deleteProject = useCallback(async (name: string) => {
		if (name === DRAFT_PROJECT.name) return
		const project = projects.find(p => p.name === name)
		if (project) {
			const projectRoot = getProjectRoot(project)
			const entries = await SpyglassClient.FS.readdir(projectRoot)
			await Promise.all(entries.map(async e => SpyglassClient.FS.unlink(e.name)))
		}
		changeProjects(projects.filter(p => p.name !== name))
		setOpenProject(DRAFT_PROJECT.name)
	}, [projects])

	const changeProject = useCallback((name: string) => {
		Store.setOpenProject(name)
		setOpenProject(name)
	}, [])

	const updateProject = useCallback((edits: Partial<ProjectMeta>) => {
		changeProjects(projects.map(p => p.name === openProject ?	{ ...p, ...edits } : p))
	}, [projects, openProject])

	const value: ProjectContext = {
		projects,
		project,
		projectUri,
		setProjectUri,
		createProject,
		changeProject,
		deleteProject,
		updateProject,
	}

	return <Project.Provider value={value}>
		{children}
	</Project.Provider>
}

export function getProjectRoot(project: ProjectMeta) {
	if (project.storage?.type === 'indexeddb') {
		return project.storage.rootUri
	}
	throw new Error(`Unsupported project storage ${project.storage?.type}`)
}

export async function getWorldgenProjectData(project: ProjectMeta | undefined): Promise<ProjectData> {
	if (!project) {
		return {}
	}
	const projectRoot = getProjectRoot(project)
	const categories = ['worldgen/noise_settings', 'worldgen/noise', 'worldgen/density_function']
	const result: ProjectData = Object.fromEntries(categories.map(c => [c, {}]))
	const entries = await SpyglassClient.FS.readdir(projectRoot)
	for (const entry of entries) {
		for (const category of categories) {
			if (entry.name.includes(category)) {
				const pattern = RegExp(`data/([a-z0-9_.-]+)/${category}/([a-z0-9_./-]+).json$`)
				const match = entry.name.match(pattern)
				if (match) {
					const data = await SpyglassClient.FS.readFile(entry.name)
					const text = new TextDecoder().decode(data)
					result[category][`${match[1]}:${match[2]}`] = safeJsonParse(text)
				}
			}
		}
	}
	return result
}
