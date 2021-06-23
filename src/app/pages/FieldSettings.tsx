import { locale } from '../Locales'

type FieldSettingsProps = {
	lang: string,
	path?: string,
}
export function FieldSettings({ lang }: FieldSettingsProps) {
	const loc = locale.bind(null, lang)
	return <main>
		<div class="settings">
			<p>{loc('settings.fields.description')}</p>
			<ul class="field-list">
				
			</ul>
		</div>
	</main>
}
