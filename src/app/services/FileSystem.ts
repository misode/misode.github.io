import * as core from '@spyglassmc/core'
import { message } from '../Utils.js'

// Copied from spyglass because it isn't exported
type Listener = (...args: any[]) => any
class BrowserEventEmitter implements core.ExternalEventEmitter {
	readonly #listeners = new Map<string, { all: Set<Listener>, once: Set<Listener> }>()

	emit(eventName: string, ...args: any[]): boolean {
		const listeners = this.#listeners.get(eventName)
		if (!listeners?.all?.size) {
			return false
		}
		for (const listener of listeners.all) {
			listener(...args)
			if (listeners.once.has(listener)) {
				listeners.all.delete(listener)
				listeners.once.delete(listener)
			}
		}
		return false
	}

	on(eventName: string, listener: Listener): this {
		if (!this.#listeners.has(eventName)) {
			this.#listeners.set(eventName, { all: new Set(), once: new Set() })
		}
		const listeners = this.#listeners.get(eventName)!
		listeners.all.add(listener)
		return this
	}

	once(eventName: string, listener: Listener): this {
		if (!this.#listeners.has(eventName)) {
			this.#listeners.set(eventName, { all: new Set(), once: new Set() })
		}
		const listeners = this.#listeners.get(eventName)!
		listeners.all.add(listener)
		listeners.once.add(listener)
		return this
	}
}

export class MixedFileSystem implements core.ExternalFileSystem {
	private watcher: MixedWatcher | undefined

	constructor(
		public readonly base: core.ExternalFileSystem,
		public readonly overlays: { prefix: string, fs: core.ExternalFileSystem }[] = [],
	) {
		this.overlays.sort((a, b) => b.prefix.length - a.prefix.length)
	}

	async setOverlay(prefix: string, fs: core.ExternalFileSystem) {
		this.overlays.push({ prefix, fs })
		this.overlays.sort((a, b) => b.prefix.length - a.prefix.length)
		if (this.watcher) {
			await this.watcher.withOverlay(prefix, fs)
		}
		return this
	}

	getFileSystem(location: core.FsLocation) {
		for (const { prefix, fs } of this.overlays) {
			if (location.toString().startsWith(prefix)) {
				return fs
			}
		}
		return this.base
	}

	chmod(location: core.FsLocation, mode: number) {
		return this.getFileSystem(location).chmod(location, mode)
	}
	mkdir(location: core.FsLocation, options?: { mode?: number | undefined, recursive?: boolean | undefined } | undefined) {
		return this.getFileSystem(location).mkdir(location, options)
	}
	readdir(location: core.FsLocation) {
		return this.getFileSystem(location).readdir(location)
	}
	readFile(location: core.FsLocation) {
		return this.getFileSystem(location).readFile(location)
	}
	showFile(path: core.FsLocation) {
		return this.getFileSystem(path).showFile(path)
	}
	stat(location: core.FsLocation) {
		return this.getFileSystem(location).stat(location)
	}
	unlink(location: core.FsLocation) {
		return this.getFileSystem(location).unlink(location)
	}
	watch(locations: core.FsLocation[], options: { usePolling?: boolean | undefined }) {
		this.watcher = new MixedWatcher(this, locations, options)
		return this.watcher
	}
	writeFile(location: core.FsLocation, data: string | Uint8Array, options?: { mode: number } | undefined) {
		return this.getFileSystem(location).writeFile(location, data, options)
	}
}

class MixedWatcher extends BrowserEventEmitter implements core.FsWatcher {
	constructor(
		fs: MixedFileSystem,
		private readonly locations: core.FsLocation[],
		private readonly options: { usePolling?: boolean | undefined },
	) {
		super()
		Promise.all([
			this.initWatcher(fs.base, locations, options),
			...fs.overlays.map(overlay => this.initWatcher(overlay.fs, locations, options)),
		]).then(() => {
			this.emit('ready')
		})
	}

	private initWatcher(fs: core.ExternalFileSystem, locations: core.FsLocation[], options: { usePolling?: boolean | undefined }) {
		return new Promise<void>((res, rej) => {
			fs.watch(locations, options)
				.once('ready', () => res())
				.on('add', uri => this.emit('add', uri))
				.on('change', uri => this.emit('change', uri))
				.on('unlink', uri => this.emit('unlink', uri))
				.on('error', e => rej(e))
		})
	}

	withOverlay(_prefix: string, fs: core.ExternalFileSystem) {
		return this.initWatcher(fs, this.locations, this.options)
	}

	async close(): Promise<void> {}
}

export class MemoryFileSystem implements core.ExternalFileSystem {
	private readonly states = new Map<string, { type: 'file', content: Uint8Array } | { type: 'directory' }>()
	private watcher: MemoryWatcher | undefined

	async chmod(_location: core.FsLocation, _mode: number): Promise<void> {
		return
	}
	async mkdir(
		location: core.FsLocation,
		_options?: { mode?: number | undefined, recursive?: boolean | undefined } | undefined,
	): Promise<void> {
		location = core.fileUtil.ensureEndingSlash(location.toString())
		if (this.states.has(location)) {
			throw new Error(`EEXIST: ${location}`)
		}
		this.states.set(location, { type: 'directory' })
	}
	async readdir(location: core.FsLocation): Promise<{ name: string, isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }[]> {
		const result: { name: string, isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }[] = []
		for (const [path, entry] of this.states.entries()) {
			if (path.startsWith(location)) {
				result.push({
					name: path,
					isDirectory: () => entry.type === 'directory',
					isFile: () => entry.type === 'file',
					isSymbolicLink: () => false,
				})	
			}
		}
		return []
	}
	async readFile(location: core.FsLocation): Promise<Uint8Array> {
		location = location.toString()
		const entry = this.states.get(location)
		if (!entry) {
			throw new Error(`ENOENT: ${location}`)
		} else if (entry.type === 'directory') {
			throw new Error(`EISDIR: ${location}`)
		}
		return entry.content
	}
	async showFile(_path: core.FsLocation): Promise<void> {
		throw new Error('showFile not supported on browser')
	}
	async stat(location: core.FsLocation): Promise<{ isDirectory(): boolean, isFile(): boolean }> {
		location = location.toString()
		const entry = this.states.get(location)
		if (!entry) {
			throw new Error(`ENOENT: ${location}`)
		}
		return { isDirectory: () => entry.type === 'directory', isFile: () => entry.type === 'file' }
	}
	async unlink(location: core.FsLocation): Promise<void> {
		location = location.toString()
		const entry = this.states.get(location)
		if (!entry) {
			throw new Error(`ENOENT: ${location}`)
		}
		this.states.delete(location)
		this.watcher?.tryEmit('unlink', location)
	}
	watch(locations: core.FsLocation[]): core.FsWatcher {
		this.watcher = new MemoryWatcher(this.states, locations)
		return this.watcher
	}
	async writeFile(
		location: core.FsLocation,
		data: string | Uint8Array,
		_options?: { mode: number } | undefined,
	): Promise<void> {
		location = location.toString()
		if (typeof data === 'string') {
			data = new TextEncoder().encode(data)
		}
		const existed = this.states.has(location)
		this.states.set(location, { type: 'file', content: data })
		if (existed) {
			this.watcher?.tryEmit('change', location)
		} else {
			this.watcher?.tryEmit('add', location)
		}
	}
}

class MemoryWatcher extends BrowserEventEmitter implements core.FsWatcher {
	constructor(
		states: Map<string, { type: 'file', content: Uint8Array } | { type: 'directory' }>,
		private readonly locations: core.FsLocation[],
	) {
		super()
		setTimeout(() => {
			for (const location of states.keys()) {
				this.tryEmit('add', location)
			}
			this.emit('ready')
		})
	}

	tryEmit(eventName: string, uri: string) {
		for (const location of this.locations) {
			if (uri.startsWith(location)) {
				this.emit(eventName, uri)
				break
			}
		}
	}

	async close(): Promise<void> {}
}

export class IndexedDbFileSystem implements core.ExternalFileSystem {
	public static readonly dbName = 'misode-spyglass-fs'
	public static readonly dbVersion = 1
	public static readonly storeName = 'files'

	private readonly db: Promise<IDBDatabase>
	private watcher: IndexedDbWatcher | undefined

	constructor() {
		this.db = new Promise((res, rej) => {
			const request = indexedDB.open(IndexedDbFileSystem.dbName, IndexedDbFileSystem.dbVersion)
			request.onerror = (e) => {
				console.warn('Database error', message((e.target as any)?.error))
				rej()
			}
			request.onsuccess = () => {
				res(request.result)
			}
			request.onupgradeneeded = (event) => {
				const db = (event.target as any).result as IDBDatabase
				db.createObjectStore(IndexedDbFileSystem.storeName, { keyPath: 'uri' })
			}
		})
	}

	async chmod(_location: core.FsLocation, _mode: number): Promise<void> {
		return
	}

	async mkdir(
		location: core.FsLocation,
		_options?: { mode?: number | undefined, recursive?: boolean | undefined } | undefined,
	): Promise<void> {
		location = core.fileUtil.ensureEndingSlash(location.toString())
		const db = await this.db
		return new Promise((res, rej) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readwrite')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			const getRequest = store.get(location)
			getRequest.onsuccess = () => {
				const entry = getRequest.result
				if (entry !== undefined) {
					rej(new Error(`EEXIST: ${location}`))
				} else {
					const putRequest = store.put({ uri: location, type: 'directory' })
					putRequest.onsuccess = () => {
						res()
					}
					putRequest.onerror = () => {
						rej()
					}
				}
			}
			getRequest.onerror	= () => {
				rej()
			}
		})
	}
	async readdir(location: core.FsLocation): Promise<{ name: string, isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }[]> {
		location = core.fileUtil.ensureEndingSlash(location.toString())
		const db = await this.db
		return new Promise((res, rej) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readonly')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			// TODO: specify range
			const request = store.openCursor()
			const result: { name: string, isDirectory(): boolean, isFile(): boolean, isSymbolicLink(): boolean }[] = []
			request.onsuccess = () => {
				if (request.result) {
					const entry = request.result.value
					result.push({
						name: request.result.key.toString(),
						isDirectory: () => entry.type === 'directory',
						isFile: () => entry.type === 'file',
						isSymbolicLink: () => false,
					})
					request.result.continue()
				} else {
					res(result)
				}
			}
			request.onerror = () => {
				rej()
			}
		})
	}
	async readFile(location: core.FsLocation): Promise<Uint8Array> {
		location = location.toString()
		const db = await this.db
		return new Promise((res, rej) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readonly')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			const request = store.get(location)
			request.onsuccess = () => {
				const entry = request.result
				if (!entry) {
					rej(new Error(`ENOENT: ${location}`))
				} else if (entry.type === 'directory') {
					rej(new Error(`EISDIR: ${location}`))
				} else {
					res(entry.content)
				}
			}
			request.onerror = () => {
				rej()
			}
		})
	}
	async showFile(_location: core.FsLocation): Promise<void> {
		throw new Error('showFile not supported on browser')
	}
	async stat(location: core.FsLocation): Promise<{ isDirectory(): boolean, isFile(): boolean }> {
		location = location.toString()
		const db = await this.db
		return new Promise((res, rej) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readonly')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			const request = store.get(location)
			request.onsuccess = () => {
				const entry = request.result
				if (!entry) {
					rej(new Error(`ENOENT: ${location}`))
				} else {
					res({
						isDirectory: () => entry.type === 'directory',
						isFile: () => entry.type === 'file',
					})
				}
			}
			request.onerror = () => {
				rej()
			}
		})
	}
	async unlink(location: core.FsLocation): Promise<void> {
		location = location.toString()
		const db = await this.db
		return new Promise((res, rej) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readwrite')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			const getRequest = store.get(location)
			getRequest.onsuccess = () => {
				const entry = getRequest.result
				if (!entry) {
					rej(new Error(`ENOENT: ${location}`))
				} else {
					const deleteRequest = store.delete(location)
					deleteRequest.onsuccess = () => {
						this.watcher?.tryEmit('unlink', location)
						res()
					}
					deleteRequest.onerror = () => {
						rej()
					}
				}
			}
			getRequest.onerror = () => {
				rej()
			}
		})
	}
	watch(locations: core.FsLocation[], _options: { usePolling?: boolean | undefined }): core.FsWatcher {
		this.watcher = new IndexedDbWatcher(this.db, locations)
		return this.watcher
	}
	async writeFile(
		location: core.FsLocation,
		data: string | Uint8Array,
		_options?: { mode: number } | undefined,
	): Promise<void> {
		location = location.toString()
		if (typeof data === 'string') {
			data = new TextEncoder().encode(data)
		}
		const db = await this.db
		return new Promise((res, rej) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readwrite')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			const getRequest = store.get(location)
			getRequest.onsuccess = () => {
				const entry = getRequest.result
				const putRequest = store.put({ uri: location, type: 'file', content: data })
				putRequest.onsuccess = () => {
					if (entry) {
						this.watcher?.tryEmit('change', location)
					} else {
						this.watcher?.tryEmit('add', location)
					}
					res()
				}
				putRequest.onerror = () => {
					rej()
				}
			}
			getRequest.onerror = () => {
				rej()
			}
		})
	}
}

class IndexedDbWatcher extends BrowserEventEmitter implements core.FsWatcher {
	constructor(
		dbPromise: Promise<IDBDatabase>,
		private readonly locations: core.FsLocation[],
	) {
		super()
		dbPromise.then((db) => {
			const transaction = db.transaction(IndexedDbFileSystem.storeName, 'readonly')
			const store = transaction.objectStore(IndexedDbFileSystem.storeName)
			const request = store.openKeyCursor()
			request.onsuccess = () => {
				if (request.result) {
					const uri = request.result.key.toString()
					this.tryEmit('add', uri)
					request.result.continue()
				} else {
					this.emit('ready')
				}
			}
			request.onerror = () => {
				this.emit('error', new Error('Watcher error'))
			}
		})
	}

	tryEmit(eventName: string, uri: string) {
		for (const location of this.locations) {
			if (uri.startsWith(location)) {
				this.emit(eventName, uri)
				break
			}
		}
	}

	async close(): Promise<void> {}
}
