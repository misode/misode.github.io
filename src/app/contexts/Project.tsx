import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { route } from 'preact-router'
import { useCallback, useContext, useMemo, useState } from 'preact/hooks'
import config from '../Config.js'
import type { VersionId } from '../services/index.js'
import { Store } from '../Store.js'
import { cleanUrl, genPath } from '../Utils.js'
import { useVersion } from './Version.jsx'

export type Project = {
	name: string,
	namespace?: string,
	version?: VersionId,
	files: ProjectFile[],
	unknownFiles?: UnknownFile[],
}
export const DRAFT_PROJECT: Project = {
	name: 'Drafts',
	namespace: 'draft',
	files: [],
}

export type ProjectFile = {
	type: string,
	id: string,
	data: any,
}

export type UnknownFile = {
	path: string,
	data: string,
}

export const FilePatterns = [
	'worldgen/[a-z_]+',
	'tags/worldgen/[a-z_]+',
	'tags/[a-z_]+',
	'[a-z_]+',
].map(e => RegExp(`^data/([a-z0-9._-]+)/(${e})/([a-z0-9/._-]+)$`))

interface ProjectContext {
	projects: Project[],
	project: Project,
	file?: ProjectFile,
	createProject: (name: string, namespace?: string, version?: VersionId) => unknown,
	deleteProject: (name: string) => unknown,
	changeProject: (name: string) => unknown,
	updateProject: (project: Partial<Project>) => unknown,
	updateFile: (type: string, id: string | undefined, file: Partial<ProjectFile>) => boolean,
	openFile: (type: string, id: string) => unknown,
	closeFile: () => unknown,
}
const Project = createContext<ProjectContext>({
	projects: [DRAFT_PROJECT],
	project: DRAFT_PROJECT,
	createProject: () => {},
	deleteProject: () => {},
	changeProject: () => {},
	updateProject: () => {},
	updateFile: () => false,
	openFile: () => {},
	closeFile: () => {},
})

export function useProject() {
	return useContext(Project)
}

export function ProjectProvider({ children }: { children: ComponentChildren }) {
	const [projects, setProjects] = useState<Project[]>(Store.getProjects())
	const { version } = useVersion()

	const [projectName, setProjectName] = useState<string>(Store.getOpenProject())
	const project = useMemo(() => {
		return projects.find(p => p.name === projectName) ?? DRAFT_PROJECT
	}, [projects, projectName])

	const [fileId, setFileId] = useState<[string, string] | undefined>(undefined)
	const file = useMemo(() => {
		if (!fileId) return undefined
		return project.files.find(f => f.type === fileId[0] && f.id === fileId[1])
	}, [project, fileId])

	const changeProjects = useCallback((projects: Project[]) => {
		Store.setProjects(projects)
		setProjects(projects)
	}, [])

	const createProject = useCallback((name: string, namespace?: string, version?: VersionId) => {
		changeProjects([...projects, { name, namespace, version, files: [] }])
	}, [projects])

	const deleteProject = useCallback((name: string) => {
		if (name === DRAFT_PROJECT.name) return
		changeProjects(projects.filter(p => p.name !== name))
	}, [projects])

	const changeProject = useCallback((name: string) => {
		Store.setOpenProject(name)
		setProjectName(name)
	}, [])

	const updateProject = useCallback((edits: Partial<Project>) => {
		changeProjects(projects.map(p => p.name === projectName ?	{ ...p, ...edits } : p))
	}, [projects, projectName])

	const updateFile = useCallback((type: string, id: string | undefined, edits: Partial<ProjectFile>) => {
		if (!edits.id) { // remove
			updateProject({ files: project.files.filter(f => f.type !== type || f.id !== id) })
		} else {
			const newId = type === 'pack_mcmeta' ? 'pack' : edits.id.includes(':') ? edits.id : `${project.namespace ?? 'minecraft'}:${edits.id}`
			const exists = project.files.some(f => f.type === type && f.id === newId)
			if (!id) { // create
				if (exists) return false
				updateProject({ files: [...project.files, { type, id: newId, data: edits.data ?? {} } ]})
				setFileId([type, newId])
			} else { // rename or update data
				if (file?.id === id && id !== newId && exists) {
					return false
				}
				updateProject({ files: project.files.map(f => f.type === type && f.id === id ? { ...f, ...edits, id: newId } : f)})
				if (file?.id === id) setFileId([type, newId])
			}
		}
		return true
	}, [updateProject, project, file])

	const openFile = useCallback((type: string, id: string) => {
		const gen = config.generators.find(g => g.id === type || genPath(g, version) === type)
		if (!gen) {
			throw new Error(`Cannot find generator of type ${type}`)
		}
		setFileId([gen.id, id])
		route(cleanUrl(gen.url))
	}, [version])

	const closeFile = useCallback(() => {
		setFileId(undefined)
	}, [])

	const value: ProjectContext = {
		projects,
		project,
		file,
		createProject,
		changeProject,
		deleteProject,
		updateProject,
		updateFile,
		openFile,
		closeFile,
	}

	return <Project.Provider value={value}>
		{children}
	</Project.Provider>
}

export function getFilePath(file: { id: string, type: string }, version: VersionId) {
	const [namespace, id] = file.id.includes(':') ? file.id.split(':') : ['minecraft', file.id]
	if (file.type === 'pack_mcmeta') {
		if (file.id === 'pack') return 'pack.mcmeta'
		return undefined
	}
	const gen = config.generators.find(g => g.id === file.type)
	if (!gen) {
		return undefined
	}
	return `data/${namespace}/${genPath(gen, version)}/${id}.json`
}

export function disectFilePath(path: string, version: VersionId) {
	if (path === 'pack.mcmeta') {
		return { type: 'pack_mcmeta', id: 'pack' }
	}
	for (const p of FilePatterns) {
		const match = path.match(p)
		if (!match) continue
		const gen = config.generators.find(g => (genPath(g, version) ?? g.id) === match[2])
		if (!gen) continue
		const namespace = match[1]
		const name = match[3].replace(/\.[a-z]+$/, '')
		return {
			type: gen.id,
			id: `${namespace}:${name}`,
		}
	}
	return undefined
}

export function getProjectData(project: Project) {
	return Object.fromEntries(['worldgen/noise_settings', 'worldgen/noise', 'worldgen/density_function'].map(type => {
		const resources = Object.fromEntries(
			project.files.filter(file => file.type === type)
				.map<[string, unknown]>(file => [file.id, file.data])
		)
		return [type, resources]
	}))
}
