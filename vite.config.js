import preact from '@preact/preset-vite'
import alias from '@rollup/plugin-alias'
import html from '@rollup/plugin-html'
import { env } from 'process'
import copy from 'rollup-plugin-copy'
import { defineConfig } from 'vite'
import config from './src/config.json'
import English from './src/locales/en.json'

export default defineConfig({
	build: {
		sourcemap: true,
		rollupOptions: {
			plugins: [
				alias({
					entries: [
						{ find: 'react', replacement: 'preact/compat' },
						{ find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
						{ find: 'react-dom', replacement: 'preact/compat' },
						{ find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
					],
				}),
				html({
					fileName: '404.html',
					title: '404',
					template: template,
				}),
				...['sounds', 'changelog', 'versions'].map(id => html({
					fileName: `${id}/index.html`,
					title: getTitle({ id: `title.${id}`, page: true }),
					template: template,
				})),
				...['worldgen', 'assets'].map(id => html({
					fileName: `${id}/index.html`,
					title: getTitle({ id, category: true }),
					template: template,
				})),
				...config.generators.map(m => html({
					fileName: `${m.url}/index.html`,
					title: getTitle(m),
					template: template,
				})),
				copy({
					targets: [
						{ src: 'src/sitemap.txt', dest: 'dist' },
						{ src: 'src/sitemap.txt', dest: 'dist', rename: 'sitemap2.txt' },
						{ src: 'src/styles/giscus.css', dest: 'dist/assets' },
						{ src: 'src/styles/giscus-burn.css', dest: 'dist/assets' },
					],
					hook: 'writeBundle',
				}),
			],
		},
	},
	json: {
		stringify: true,
	},
	define: {
		__LATEST_VERSION__: env.latest_version,
	},
	plugins: [preact()],
})

function getTitle(m) {
	const minVersion = Math.max(0, config.versions.findIndex(v => m.minVersion === v.id))
	const versions = config.versions.slice(minVersion).map(v => v.id)
	versions.splice(0, versions.length - 3)
	return `${English[m.id] ?? ''}${m.page ? '' : ` Generator${m.category === true ? 's' : ''}`} Minecraft ${versions.join(', ')}`
}

function template({ files, title }) {
	const source = files.html.find(f => f.fileName === 'index.html').source
	return source.replace(/<title>.*<\/title>/, `<title>${title}</title>`)
}
