import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import type { VersionId } from '../services/index.js'
import { ROOT_URI } from '../services/Spyglass.js'
import { Store } from '../Store.js'

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
		rootUri: `${ROOT_URI}drafts/`,
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
	const [openProject, setProjectName] = useState<string>()

	useEffect(() => {
		const initialProject = Store.getOpenProject()
		const project = projects.find(p => p.name === initialProject)
		if (!project) {
			return
		}
		if (project.storage !== undefined) {
			setProjectName(initialProject)
			return
		}
		// TODO: Import legacy projects
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

	const deleteProject = useCallback((name: string) => {
		if (name === DRAFT_PROJECT.name) return
		changeProjects(projects.filter(p => p.name !== name))
	}, [projects])

	const changeProject = useCallback((name: string) => {
		Store.setOpenProject(name)
		setProjectName(name)
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
