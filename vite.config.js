import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import html from '@rollup/plugin-html'
import config from './src/config.json'
import { env } from 'process'

export default defineConfig({
	build: {
		sourcemap: true,
		rollupOptions: {
			plugins: [
				html({
					fileName: `404.html`,
					title: '404',
					template: template,
				}),
				...config.models.map(m => html({
					fileName: `${m.id}/index.html`,
					title: getTitle(m),
					template: template,
				})),
			],
		},
	},
	json: {
		stringify: true,
	},
	define: {
		__MCDATA_MASTER_HASH__: env.mcdata_hash,
		__VANILLA_DATAPACK_SUMMARY_HASH__: env.vanilla_datapack_summary_hash,
	},
	plugins: [preact()],
})

function getTitle(m) {
	const minVersion = Math.max(0, config.versions.findIndex(v => m.minVersion === v.id))
	const versions = config.versions.slice(minVersion).map(v => v.id).join(', ')
	return `${m.name} Generator${m.category === true ? 's' : ''} Minecraft ${versions}`
}

function template({ files, title }) {
	const source = files.html.find(f => f.fileName === 'index.html').source
	return source.replace(/<title>.*<\/title>/, `<title>${title}</title>`)
}
