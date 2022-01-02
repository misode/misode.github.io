import config from '../../config.json'
import { Store } from '../Store'
import type { VersionId } from './Schemas'

export type Project = {
	name: string,
	namespace: string,
	version?: VersionId,
	files: ProjectFile[],
}

export type ProjectFile = {
	type: string,
	id: string,
	data: any,
}

let Projects: Project[] | undefined

function getProjects() {
	if (!Projects) {
		Projects = Store.getProjects()
	}
	return Projects
}

export function getProject(projectName: string) {
	const projects = getProjects()
	return projects.find(p => p.name === projectName)
}

export function changeFile(project: Project, type: string, from: string | undefined, to: string | undefined, data: any) {
	const index = project.files.findIndex(f => f.type === type && f.id === from)
	if (!to && index >= 0) {
		project.files.splice(index) // remove
	} else if (!from && to) {
		project.files.push({ type, id: to, data }) // create
	} else if (index >= 0 && to) {
		project.files[index].id = to // rename or update data
		project.files[index].data = data
	}
	Store.setProjects(Projects)
}

export function getFilePath(file: ProjectFile) {
	const [namespace, id] = file.id.includes(':') ? file.id.split(':') : ['minecraft', file.id]
	const gen = config.generators.find(g => g.id === file.type)
	if (!gen) {
		throw new Error(`Cannot find generator of type ${file.type}`)
	}
	return `data/${namespace}/${gen.path ?? gen.id}/${id}`
}
