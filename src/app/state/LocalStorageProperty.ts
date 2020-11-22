import { Property } from './Property'

export class LocalStorageProperty extends Property<string> {
  constructor(private id: string, fallback: string) {
    super(localStorage.getItem(id) ?? fallback)
  }
  set(value: string) {
    super.set(value)
    localStorage.setItem(this.id, value)
  }
  get(): string {
    return this.value
  }
}
