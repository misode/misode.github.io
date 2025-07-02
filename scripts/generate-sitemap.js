import { createWriteStream } from 'fs'
import { SitemapStream, streamToPromise } from 'sitemap'

const links = [
  '/',
  '/generators/',
  '/loot-table/',
  '/predicate/',
  '/item-modifier/',
  '/advancement/',
  '/recipe/',
  '/text-component/',
  '/chat-type/',
  '/dimension/',
  '/dimension-type/',
  '/world/',
  '/worldgen/',
  '/worldgen/biome/',
  '/worldgen/carver/',
  '/worldgen/feature/',
  '/worldgen/density-function/',
  '/worldgen/placed-feature/',
  '/worldgen/noise/',
  '/worldgen/noise-settings/',
  '/worldgen/structure-feature/',
  '/worldgen/structure/',
  '/worldgen/structure-set/',
  '/worldgen/surface-builder/',
  '/worldgen/processor-list/',
  '/worldgen/template-pool/',
  '/worldgen/world-preset/',
  '/worldgen/flat-world-preset/',
  '/sounds/',
  '/report/',
  '/upgrader/',
  '/changelog/',
  '/versions/',
].map(url => ({
  url,
  changefreq: 'weekly',
  priority: 0.7
}))

const sitemap = new SitemapStream({ hostname: 'https://mcfunctions.com' })
const writeStream = createWriteStream('./dist/sitemap.xml')

sitemap.pipe(writeStream)
links.forEach(link => sitemap.write(link))
sitemap.end()

streamToPromise(sitemap).then(() => {
  console.log('✅ sitemap.xml generated in dist/')
})
