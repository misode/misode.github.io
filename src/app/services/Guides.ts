export interface Guide {
	id: string,
	title: string,
	versions?: string[],
	tags?: string[],
}

declare var __GUIDES__: Guide[]

export function getGuides() {
	return __GUIDES__
}

export function getGuide(id: string): Guide {
	const guide = getGuides().find(g => g.id === id)
	if (guide === undefined) {
		return { id, title: 'Unknown Guide' }
	}
	return guide
}
