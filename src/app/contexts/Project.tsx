import type { ComponentChildren } from 'preact'
import { createContext } from 'preact'
import { useCallback, useContext, useMemo, useState } from 'preact/hooks'
import config from '../../config.json'
import type { VersionId } from '../services'
import { Store } from '../Store'

export type Project = {
	name: string,
	namespace: string,
	version?: VersionId,
	files: ProjectFile[],
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

interface ProjectContext {
	project: Project,
	changeProject: (name: string) => unknown,
	updateProject: (project: Partial<Project>) => unknown,
	updateFile: (type: string, id: string | undefined, file: Partial<ProjectFile>) => unknown,
}
const Project = createContext<ProjectContext>({
	project: DRAFT_PROJECT,
	changeProject: () => {},
	updateProject: () => {},
	updateFile: () => {},
})

export function useProject() {
	return useContext(Project)
}

export function ProjectProvider({ children }: { children: ComponentChildren }) {
	const [projects, setProjects] = useState<Project[]>(Store.getProjects())
	const [projectName, setProjectName] = useState<string>(DRAFT_PROJECT.name)

	const project = useMemo(() => {
		return projects.find(p => p.name === projectName) ?? DRAFT_PROJECT
	}, [projects, projectName])

	const changeProjects = useCallback((projects: Project[]) => {
		Store.setProjects(projects)
		console.log('post', JSON.stringify(projects[0].files))
		setProjects(projects)
	}, [])

	const updateProject = useCallback((edits: Partial<Project>) => {
		changeProjects(projects.map(p => p.name === projectName ?	{ ...p, ...edits } : p))
	}, [projects, projectName])

	const updateFile = useCallback((type: string, id: string | undefined, edits: Partial<ProjectFile>) => {
		console.log('pre', JSON.stringify(project.files))
		if (id && !edits.id) { // remove
			console.log('Remove', id)
			updateProject({ files: project.files.filter(f => f.type !== type || f.id !== id) })
		} else if (!id && edits.id) { // create
			console.log('Create', edits.id)
			updateProject({ files: [...project.files, { type, id: edits.id, data: edits.data ?? {} } ]})
		} else { // rename or update data
			console.log('Update', edits)
			updateProject({ files: project.files.map(f => f.type === type && f.id === id ? { ...f, ...edits } : f)})
		}
	}, [updateProject, project])

	const value: ProjectContext = {
		project,
		changeProject: setProjectName,
		updateProject,
		updateFile,
	}

	return <Project.Provider value={value}>
		{children}
	</Project.Provider>
}

export function getFilePath(file: ProjectFile) {
	const [namespace, id] = file.id.includes(':') ? file.id.split(':') : ['minecraft', file.id]
	const gen = config.generators.find(g => g.id === file.type)
	if (!gen) {
		throw new Error(`Cannot find generator of type ${file.type}`)
	}
	return `data/${namespace}/${gen.path ?? gen.id}/${id}`
}
