import type { INode, Path } from '@mcschema/core'
import { DataModel } from '@mcschema/core'

export class ModelWrapper extends DataModel {
	constructor(
		schema: INode<any>,
		private readonly mapper: (path: Path) => Path,
		private readonly getter: (path: Path) => any,
		private readonly setter: (path: Path, value: any, silent?: boolean) => any,
	) {
		super(schema)
	}

	map(path: Path) {
		return this.mapper(path)
	}

	get(path: Path) {
		return this.getter(path)
	}

	set(path: Path, value: any, silent?: boolean) {
		return this.setter(path, value, silent)
	}
}
