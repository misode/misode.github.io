type FieldSetting = {
  path?: string
  name?: string
  hidden?: boolean
}

export class Settings {
  fields: FieldSetting[]

  constructor(private local_storage: string) {
    const settings = JSON.parse(localStorage.getItem(local_storage) ?? '{}')
    if (!Array.isArray(settings.fields)) settings.fields = []
    this.fields = settings.fields
    this.save()
  }

  save() {
    const settings = JSON.stringify({ fields: this.fields }) 
    localStorage.setItem(this.local_storage, settings)
    this.fields = [...this.fields.filter(v => v?.path), {}]
  }
}
