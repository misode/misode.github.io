import { Identifier } from 'deepslate'
import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import config from '../Config.js'
import type { VersionId } from '../services/index.js'
import { DEFAULT_VERSION } from '../services/index.js'
import { DRAFTS_URI, PROJECTS_URI, SpyglassClient } from '../services/Spyglass.js'
import { Store } from '../Store.js'
import { genPath, hexId, message } from '../Utils.js'

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
	project: ProjectMeta,
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
	const [openProject, setOpenProject] = useState<string>()

	const tryOpenProject = useCallback(async (projectName: string) => {
		const project = projects.find(p => p.name === projectName)
		if (!project) {
			return
		}
		if (project.storage === undefined) {
			try {
				const projectRoot = `${PROJECTS_URI}${hexId()}/`
				console.log(`Upgrading project ${projectName} to IndexedDB at ${projectRoot}`)
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
							: `${projectRoot}data/${namespace}/${type}/${path}.json`
						return SpyglassClient.FS.writeFile(uri, JSON.stringify(file.data, null, 2))
					}))
				}
				if (project.unknownFiles) {
					await Promise.all(project.unknownFiles.map(async file => {
						const uri = projectRoot + file.path
						return SpyglassClient.FS.writeFile(uri, file.data)
					}))
				}
				changeProjects(projects.map(p => p === project ? { ...p, storage: { type: 'indexeddb', rootUri: projectRoot } } : p))
			} catch (e) {
				console.error(`Something went wrong upgrading project ${projectName}: ${message(e)}`)
				return
			}
		}
		setOpenProject(projectName)
	}, [projects])

	useEffect(() => {
		tryOpenProject(Store.getOpenProject())
	}, [])

	const project = useMemo(() => {
		return projects.find(p => p.name === openProject) ?? DRAFT_PROJECT
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
		setOpenProject(undefined)
	}, [projects])

	const changeProject = useCallback((name: string) => {
		Store.setOpenProject(name)
		tryOpenProject(name)
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
