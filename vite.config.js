import preact from '@preact/preset-vite'
import alias from '@rollup/plugin-alias'
import html from '@rollup/plugin-html'
import glob from 'fast-glob'
import fs from 'fs'
import yaml from 'js-yaml'
import { env } from 'process'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import config from './src/config.json'
import English from './src/locales/en.json'

const guides = glob.sync('src/guides/**/*.md').flatMap(g => {
	const content = fs.readFileSync(g).toString('utf-8')
	if (!content.startsWith('---')) return []
	try {
		const frontMatter = yaml.load(content.substring(3, content.indexOf('---', 3)))

		if (typeof frontMatter !== 'object') return []
		return [{
			id: g.replace('src/guides/', '').replace('.md', ''),
			...frontMatter,
		}]
	} catch (e) {
		return []
	}
})

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
					template,
				}),
				...['sounds', 'changelog', 'versions', 'guides'].map(id => html({
					fileName: `${id}/index.html`,
					title: getTitle({ id: `title.${id}`, page: true }),
					template,
				})),
				...['worldgen', 'assets'].map(id => html({
					fileName: `${id}/index.html`,
					title: getTitle({ id, category: true }),
					template,
				})),
				...config.generators.map(m => html({
					fileName: `${m.url}/index.html`,
					title: getTitle(m),
					template,
				})),
				...guides.map(g => {
					return html({
						fileName: `guides/${g.id}/index.html`,
						title: `${g.title} Minecraft${g.versions ? ` ${g.versions.join(' ')}` : ''}`,
						template,
					})
				}),
			],
		},
	},
	json: {
		stringify: true,
	},
	define: {
		__LATEST_VERSION__: env.latest_version,
		__GUIDES__: guides,
	},
	plugins: [
		preact(),
		viteStaticCopy({
			targets: [
				{ src: 'src/.nojekyll', dest: '' },
				{ src: 'src/sitemap.txt', dest: '' },
				{ src: 'src/styles/giscus.css', dest: 'assets' },
				{ src: 'src/styles/giscus-burn.css', dest: 'assets' },
				{ src: 'src/guides/*', dest: 'guides' },
			],
		}),
	],
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
