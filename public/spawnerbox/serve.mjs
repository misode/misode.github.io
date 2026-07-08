// Zero-dependency static server for the Spawner Box Generator tool.
// Run with:  node serve.mjs [port]
// No `npm install` required — uses only Node's built-in modules.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { spawn } from 'node:child_process'

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.argv[2]) || 4599

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (path === '/' || path.endsWith('/')) path += 'index.html'
    // Keep requests inside the tool folder.
    const filePath = normalize(join(root, path))
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Forbidden')
      return
    }
    const data = await readFile(filePath)
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404).end('Not found')
  }
})

server.listen(port, () => {
  const url = `http://localhost:${port}/`
  console.log(`Spawner Box Generator running at ${url}`)
  console.log('Press Ctrl+C to stop.')
  openBrowser(url)
})

function openBrowser(url) {
  const platform = process.platform
  const cmd = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
  } catch { /* opening a browser is best-effort */ }
}
