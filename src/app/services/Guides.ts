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

export function getGuide(id: string) {
	return getGuides().find(g => g.id === id)
}
