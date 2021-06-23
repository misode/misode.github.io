import { hexId } from '../Utils'

export class Mounter {
	private registry: { [id: string]: (el: Element) => void } = {}

	register(callback: (el: Element) => void): string {
		const id = hexId()
		this.registry[id] = callback
		return id
	}

	on(type: string, callback: (el: Element) => void): string {
		return this.register(el => {
			el.addEventListener(type, evt => {
				callback(el)
				evt.stopPropagation()
			})
		})
	}

	onChange(callback: (el: Element) => void): string {
		return this.on('change', callback)
	}

	onClick(callback: (el: Element) => void): string {
		return this.on('click', callback)
	}

	mounted(el: Element): void {
		el.querySelectorAll('[data-id]').forEach(el => {
			const id = el.getAttribute('data-id')!
			this.registry[id]?.(el)
		})
		this.registry = {}
	}
}
