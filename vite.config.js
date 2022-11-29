import preact from '@preact/preset-vite'
import html from '@rollup/plugin-html'
import glob from 'fast-glob'
import fs from 'fs'
import yaml from 'js-yaml'
import { createRequire } from 'module'
import { env } from 'process'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
const require = createRequire(import.meta.url)
const config = require('./src/config.json')
const English = require('./src/locales/en.json')

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
		console.warn('Failed loading guide', g, e.message)
		return []
	}
})

export default defineConfig({
	server: {
		port: 3000,
	},
	resolve: {
		alias: [
			{ find: 'react', replacement: 'preact/compat' },
			{ find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
			{ find: 'react-dom', replacement: 'preact/compat' },
			{ find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
		],
	},
	build: {
		sourcemap: true,
		rollupOptions: {
			plugins: [
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
						title: `${g.title} - Minecraft${g.versions ? ` ${g.versions.join(' ')}` : ''}`,
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
				{ src: 'src/styles/giscus.css', dest: 'assets' },
				{ src: 'src/styles/giscus-burn.css', dest: 'assets' },
				{ src: 'src/guides/*', dest: 'guides' },
			],
		}),
		visualizer({ open: true }),
		{
			name: 'watch-guides',
			enforce: 'post',
			handleHotUpdate({ file, server }) {
				const match = file.match(/src\/guides\/([a-z0-9-]+)\.md/)
				if (match && match[1]) {
					server.ws.send({
						type: 'custom',
						event: 'guide-update',
						data: match[1],
					})
				}
			},
		},
	],
})

function getTitle(m) {
	const minVersion = Math.max(0, config.versions.findIndex(v => m.minVersion === v.id))
	const versions = config.versions.slice(minVersion).map(v => v.id)
	versions.splice(0, versions.length - 3)
	return `${English[m.id] ?? ''}${m.page ? '' : ` Generator${m.category === true ? 's' : ''}`} - Minecraft ${versions.join(', ')}`
}

function template({ files, title }) {
	const source = files.html.find(f => f.fileName === 'index.html').source
	return source.replace(/<title>.*<\/title>/, `<title>${title}</title>`)
}
