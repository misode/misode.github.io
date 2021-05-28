import { hexId } from "../Utils"

type PropertyWatcher<T> = (value: T, oldValue: T | null) => void
type NamedPropertyWatcher<T> = {
  name: string
  watcher: PropertyWatcher<T>
}

export class Property<T> {
  private watchers: NamedPropertyWatcher<T>[] = []

  constructor(public value: T) {}

  set(value: T) {
    if (this.value === value) return
    const oldValue = this.value
    this.value = value
    this.watchers.forEach(w => w.watcher(this.value, oldValue))
  }

  get(): T {
    return this.value
  }

  watchRun(watcher: PropertyWatcher<T>, name?: string) {
    watcher(this.value, null)
    return this.watch(watcher, name)
  }

  watch(watcher: PropertyWatcher<T>, name?: string) {
    name = name ?? hexId()
    const w = this.watchers.find(w => w.name === name)
    if (w) {
      w.watcher = watcher
    } else {
      this.watchers.push({ name, watcher })
    }
    return this
  }

  trigger() {
    this.watchers.forEach(w => w.watcher(this.value, null))
  }
}
