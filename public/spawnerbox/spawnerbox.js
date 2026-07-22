'use strict'

// ---------------------------------------------------------------------------------------------
// Data: mob pools and zone levels (kept in sync with the Kotlin backend).
// ---------------------------------------------------------------------------------------------
const CATEGORIES = ['green', 'yellow', 'orange', 'red', 'pink']

const MOB_POOLS = {
  green: ['Snail', 'wild_boar_brown', 'plague_rat_black', 'Plant_Monster', 'skr_barebone', 'Stone_Minion', 'Wraith', 'slim', 'Stone_Golem', 'skr_ranger'],
  yellow: ['plague_rat_grey', 'skr_skirmisher', 'skr_stray', 'wolf', 'beaver', 'small_spider', 'crazy_cat', 'Lava_Salamander', 'fog_lizard_brown', 'magma_slime', 'snake', 'Salamander', 'Stone_Minion_Fire', 'Stone_Fire_Golem'],
  orange: ['skr_arbalist', 'skr_berserker', 'Stone_Ice_Golem', 'Stone_Minion_Ice', 'Wraith', 'poison_frog', 'giant_ant', 'lizard', 'plague_rat_brown', 'wild_boar_grey', 'fog_lizard_green'],
  red: ['zombie_improve', 'bear', 'skr_witherbone', 'Salamander_Blood', 'Salamander_Ice', 'fog_lizard_dark', 'big_spider', 'blood_slime', 'plague_rat_red', 'plague_rat_white'],
  pink: ['zombie_elite'],
}

const COUNT_MULTIPLIER = { plague_rat_red: 2.0, plague_rat_white: 2.0, fog_lizard_dark: 1.5 }

// Popular ground blocks/tags for onblock{m=...}. '#' entries are real Java Edition block tags
// (verified against minecraft.wiki); the rest are single Bukkit materials.
const POPULAR_ONBLOCK = [
  '#dirt', 'GRASS_BLOCK', '#base_stone_overworld', '#base_stone_nether',
  '#sand', 'GRAVEL', '#nylium', 'SOUL_SAND',
  '#logs', '#leaves', '#planks', '#wool', '#terracotta', '#stone_bricks',
  '#snow', '#ice', '#coral_blocks', '#animals_spawnable_on',
]

// minLevel, maxLevel, leashRange, cooldownSeconds, direction
const ZONE_LEVELS = {
  green: { min: 1, max: 10, leash: 10, cooldown: 20, dir: 'CENTER_HIGH' },
  yellow: { min: 10, max: 50, leash: 20, cooldown: 60, dir: 'CENTER_HIGH' },
  orange: { min: 50, max: 100, leash: 30, cooldown: 120, dir: 'EDGE_HIGH' },
  red: { min: 100, max: 150, leash: 30, cooldown: 300, dir: 'EDGE_HIGH' },
  pink: { min: 150, max: 200, leash: 30, cooldown: 1200, dir: 'CENTER_HIGH' },
}

const GLOBAL_ZONE_LEVEL_MIN = 1
const GLOBAL_ZONE_LEVEL_MAX = 200

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------
function parseMarkers(raw) {
  const text = raw.trim()
  if (!text) return []
  const markers = []
  if (text[0] === '[') {
    const arr = JSON.parse(text)
    for (const m of arr) {
      const color = String(m.color || m.category || '').toLowerCase()
      if (!CATEGORIES.includes(color)) continue
      markers.push({ color, x: Math.floor(m.x), y: Math.floor(m.y), z: Math.floor(m.z) })
    }
    return markers
  }
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const parts = t.split(/[\s,]+/)
    if (parts.length < 4) continue
    const color = parts[3].toLowerCase()
    if (!CATEGORIES.includes(color)) continue
    markers.push({ color, x: parseInt(parts[0], 10), y: parseInt(parts[1], 10), z: parseInt(parts[2], 10) })
  }
  return markers.filter(m => Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.z))
}

// ---------------------------------------------------------------------------------------------
// Pipeline (mirrors SpawnerBoxSystem)
// ---------------------------------------------------------------------------------------------
function detectColumns(markers) {
  const map = new Map()
  for (const m of markers) {
    const key = `${m.color}|${m.x}|${m.z}`
    let c = map.get(key)
    if (!c) { c = { color: m.color, x: m.x, z: m.z, baseY: m.y, height: 0 }; map.set(key, c) }
    c.height++
    c.baseY = Math.min(c.baseY, m.y)
  }
  return [...map.values()]
}

function detectGroups(columns, mergeRadius) {
  const groups = []
  for (const color of CATEGORIES) {
    const cols = columns.filter(c => c.color === color)
    const n = cols.length
    if (n === 0) continue
    const parent = Array.from({ length: n }, (_, i) => i)
    const find = a => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a] } return a }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = cols[i].x - cols[j].x, dz = cols[i].z - cols[j].z
        if (Math.hypot(dx, dz) <= mergeRadius) parent[find(i)] = find(j)
      }
    }
    const buckets = new Map()
    for (let i = 0; i < n; i++) {
      const r = find(i)
      if (!buckets.has(r)) buckets.set(r, [])
      buckets.get(r).push(cols[i])
    }
    for (const members of buckets.values()) {
      groups.push(makeGroup(color, members))
    }
  }
  groups.sort((a, b) => CATEGORIES.indexOf(a.color) - CATEGORIES.indexOf(b.color) || a.centerX - b.centerX || a.centerZ - b.centerZ)
  return groups
}

function makeGroup(color, columns) {
  const avg = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
  return {
    color,
    columns,
    centerX: avg(columns.map(c => c.x)),
    centerZ: avg(columns.map(c => c.z)),
    baseY: Math.min(...columns.map(c => c.baseY)),
    maxColumnHeight: Math.max(...columns.map(c => c.height)),
    mobCount: columns.reduce((s, c) => s + c.height, 0),
  }
}

function pureMobIds(mobName) {
  return mobName.split(',').map(s => s.trim()).filter(Boolean)
    .map(s => s.replace(/^\s*\d+(?:\.\d+)?%\s*/, '').trim()).filter(Boolean)
}

// A MobName may hold several mobs: "MobA,MobB" (equal chance) or weighted "50%MobA,50%MobB".
function parseMobs(mobName) {
  return mobName.split(',').map(s => s.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(\d+(?:\.\d+)?)%\s*(.+)$/)
    return m ? { id: m[2].trim(), weight: parseFloat(m[1]) } : { id: part, weight: null }
  })
}
function buildMobName(mobs) {
  const list = mobs.filter(m => m.id)
  if (!list.length) return ''
  const allWeighted = list.every(m => Number.isFinite(m.weight) && m.weight > 0)
  return list.map(m => (allWeighted ? `${trimNum(m.weight)}%${m.id}` : m.id)).join(',')
}
function trimNum(v) { return Number.isInteger(v) ? String(v) : String(v) }

function computeRadius(h, s) {
  const raw = s.minSpawnRadius + (h - 1) * s.radiusPerHeightBlock
  return Math.min(s.maxSpawnRadius, Math.max(s.minSpawnRadius, raw))
}
function computeRadiusY(h) { return Math.max(3, Math.min(8, h + 2)) }

function computeMaxMobs(mobCount, mobName, s) {
  const ids = pureMobIds(mobName)
  const mult = ids.reduce((m, id) => Math.max(m, COUNT_MULTIPLIER[id] || 1), 1)
  return Math.max(s.mobsPerSpawn, Math.max(1, Math.ceil(mobCount / mult)))
}

function toDrafts(groups, s) {
  const counters = {}
  return groups.map((g, index) => {
    const pool = MOB_POOLS[g.color] || []
    const mobName = pool.length ? pool[index % pool.length] : ''
    const zone = ZONE_LEVELS[g.color]
    const difficulty = s.difficultyByColor[g.color] || 'E'
    const spawnerGroup = `${s.zone}_${s.area}_${difficulty}`
    counters[spawnerGroup] = (counters[spawnerGroup] || 0) + 1
    const name = `${spawnerGroup}_${String(counters[spawnerGroup]).padStart(3, '0')}`
    return {
      name, spawnerGroup, folder: s.folder, world: s.world,
      zoneName: s.zone, areaName: s.area, difficulty, batch: `${s.zone}_${s.area}`,
      x: g.centerX, y: g.baseY, z: g.centerZ,
      color: g.color, maxColumnHeight: g.maxColumnHeight, mobCount: g.mobCount,
      mobName, mobs: parseMobs(mobName), zone, mobLevel: zone.max,
      maxMobs: computeMaxMobs(g.mobCount, mobName, s),
      mobsPerSpawn: s.mobsPerSpawn,
      radius: computeRadius(g.maxColumnHeight, s), radiusY: computeRadiusY(g.maxColumnHeight),
      cooldown: zone.cooldown, warmup: 0, leashRange: zone.leash,
      activationRange: 120, scalingRange: 25,
      onBlockFilter: s.onBlockFilter, condRadius: s.condRadius,
    }
  })
}

const MOB_TO_CATEGORY = (() => {
  const m = {}
  for (const cat of CATEGORIES) for (const id of MOB_POOLS[cat]) if (!(id in m)) m[id] = cat
  return m
})()

function fmt1(v) { return Number(v).toFixed(1) }

// ---------------------------------------------------------------------------------------------
// Import existing MythicMobs spawner YAML back into editable drafts.
// ---------------------------------------------------------------------------------------------
function importSpawnerYaml(text, folder, settings) {
  const drafts = []
  const lines = text.split(/\r?\n/)
  let cur = null
  let inConds = false
  const flush = () => { if (cur) { drafts.push(finishImported(cur, folder, settings)); cur = null } }

  for (const raw of lines) {
    if (!raw.trim()) continue
    const head = raw.match(/^([A-Za-z0-9_]+):\s*$/)
    if (head) { flush(); cur = { name: head[1], fields: {}, conditions: [] }; inConds = false; continue }
    if (!cur) continue
    if (/^\s*SpawnConditions:\s*$/.test(raw)) { inConds = true; continue }
    const item = raw.match(/^\s*-\s*(.+)$/)
    if (item && inConds) { cur.conditions.push(item[1].trim()); continue }
    const kv = raw.match(/^\s*([A-Za-z]+):\s*(.*)$/)
    if (kv) { inConds = false; cur.fields[kv[1]] = kv[2].trim().replace(/^'(.*)'$/, '$1') }
  }
  flush()
  return drafts
}

function finishImported(block, folder, s) {
  const f = block.fields
  const num = (k, d) => { const v = parseFloat(f[k]); return Number.isFinite(v) ? v : d }
  const mobName = f.MobName || ''
  const color = MOB_TO_CATEGORY[pureMobIds(mobName)[0]] || 'green'
  const radius = num('Radius', 4)
  const maxMobs = Math.round(num('MaxMobs', 1))
  // Reverse the radius formula and the count multiplier to reconstruct display-only values.
  const height = Math.max(1, Math.round((radius - s.minSpawnRadius) / s.radiusPerHeightBlock) + 1)
  const mult = pureMobIds(mobName).reduce((m, id) => Math.max(m, COUNT_MULTIPLIER[id] || 1), 1)
  const onblock = (block.conditions.find(c => c.includes('onblock')) || '').match(/m=([^}\s]+)/)
  const cond = (block.conditions.find(c => c.includes('mobsInRadius')) || '').match(/radius=(\d+)/)
  const group = f.SpawnerGroup || block.name.replace(/_\d+$/, '')
  const parts = group.split('_')
  const difficulty = parts.length >= 3 ? parts[parts.length - 1] : '?'
  const areaName = parts.length >= 3 ? parts[parts.length - 2] : '?'
  const zoneName = parts.length >= 3 ? parts.slice(0, parts.length - 2).join('_') : group
  return {
    name: block.name,
    spawnerGroup: group,
    folder,
    zoneName, areaName, difficulty, batch: `${zoneName}_${areaName}`,
    world: f.World || 'world',
    x: Math.round(num('X', 0)), y: Math.round(num('Y', 0)), z: Math.round(num('Z', 0)),
    color, maxColumnHeight: height, mobCount: Math.round(maxMobs * mult),
    mobName, mobs: parseMobs(mobName), zone: ZONE_LEVELS[color], mobLevel: Math.round(num('MobLevel', 1)),
    maxMobs, mobsPerSpawn: Math.round(num('MobsPerSpawn', 1)),
    radius, radiusY: num('RadiusY', 3),
    cooldown: Math.round(num('Cooldown', 0)), warmup: Math.round(num('Warmup', 0)),
    leashRange: num('LeashRange', 10),
    activationRange: num('ActivationRange', 120), scalingRange: num('ScalingRange', 25),
    onBlockFilter: onblock ? onblock[1] : s.onBlockFilter,
    condRadius: cond ? parseInt(cond[1], 10) : s.condRadius,
  }
}

function zoneFromFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

async function loadFiles(fileList) {
  const files = [...fileList]
  if (!files.length) return
  const s = readSettings()
  const folder = s.folder
  let imported = []
  let markerText = null
  let markerFileName = null
  for (const file of files) {
    const text = await file.text()
    const trimmed = text.trimStart()
    if (file.name.endsWith('.json') || trimmed[0] === '[' || trimmed[0] === '{') {
      markerText = text // JSON marker dump -> run the normal pipeline
      markerFileName = file.name
    } else {
      imported = imported.concat(importSpawnerYaml(text, folder, s))
    }
  }
  if (markerText !== null) {
    // Zone token always comes from the loaded JSON's name.
    const zone = zoneFromFileName(markerFileName || '')
    if (zone) { $('zone').value = zone; $('folder').value = zone.toLowerCase() }
    $('markers').value = markerText
    $('markers').dispatchEvent(new Event('input'))
    generate()
    return
  }
  if (!imported.length) return
  drafts = imported
  $('summary').textContent = `— loaded ${drafts.length} spawner(s) from file`
  renderWarnings([])
  renderCards()
  $('resultsPanel').hidden = false
  $('yamlPanel').hidden = false
  $('resultsPanel').scrollIntoView({ behavior: 'smooth' })
}

function renderYaml(d) {
  const types = pureMobIds(d.mobName).join(',')
  const lines = [
    `${d.name}:`,
    `  MobName: ${d.mobName}`,
    `  World: ${d.world}`,
    `  SpawnerGroup: ${d.spawnerGroup}`,
    `  X: ${d.x}`, `  Y: ${d.y}`, `  Z: ${d.z}`,
    `  Yaw: 0.0`, `  Pitch: 0.0`,
    `  Radius: ${fmt1(d.radius)}`, `  RadiusY: ${fmt1(d.radiusY)}`,
    `  UseTimer: true`,
    `  MaxMobs: '${d.maxMobs}'`, `  MobLevel: '${d.mobLevel}'`,
    `  MobsPerSpawn: ${d.mobsPerSpawn}`,
    `  Cooldown: ${d.cooldown}`, `  Warmup: ${d.warmup}`,
    `  ActivationRange: ${fmt1(d.activationRange)}`, `  ScalingRange: ${fmt1(d.scalingRange)}`,
    `  LeashRange: ${fmt1(d.leashRange)}`,
    `  HealOnLeash: false`, `  ResetThreatOnLeash: false`, `  Breakable: false`,
    `  CheckForPlayers: true`, `  ShowFlames: false`, `  Conditions: []`,
    `  SpawnConditions:`,
    `  - onblock{m=${d.onBlockFilter}} true`,
    `  - mobsInRadius{types=${types};amount=0;radius=${d.condRadius}}`,
    `  CooldownTimer: 0`, `  WarmupTimer: 0`, `  ActiveMobs: 0`,
  ]
  return lines.join('\n')
}

// ---------------------------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------------------------
const $ = id => document.getElementById(id)
let drafts = []

function difficultyByColor() {
  const g = id => ($(id).value.trim().toUpperCase() || '?')
  return {
    green: g('diff-green'), yellow: g('diff-yellow'), orange: g('diff-orange'),
    red: g('diff-red'), pink: g('diff-pink'),
  }
}

function readSettings() {
  const num = (id, d) => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : d }
  return {
    folder: $('folder').value.trim(),
    zone: $('zone').value.trim().toUpperCase(),
    area: $('area').value.trim().toUpperCase(),
    difficultyByColor: difficultyByColor(),
    world: $('world').value.trim() || 'world',
    mergeRadius: num('mergeRadius', 10),
    minSpawnRadius: num('minSpawnRadius', 4),
    radiusPerHeightBlock: num('radiusPerHeightBlock', 2),
    maxSpawnRadius: num('maxSpawnRadius', 24),
    mobsPerSpawn: Math.max(1, Math.round(num('mobsPerSpawn', 1))),
    onBlockFilter: $('onBlockFilter').value.trim() || '#dirt',
    condRadius: Math.round(num('condRadius', 4)),
  }
}

function generate() {
  const markers = parseMarkers($('markers').value)
  const s = readSettings()
  const columns = detectColumns(markers)
  const groups = detectGroups(columns, s.mergeRadius)
  drafts = toDrafts(groups, s)

  const warnings = []
  if (markers.length === 0) warnings.push({ fatal: true, msg: 'No marker blocks parsed.' })
  for (const g of groups) if (!(MOB_POOLS[g.color] || []).length) warnings.push({ fatal: true, msg: `Category ${g.color} has no mob pool.` })
  if (drafts.length > 200) warnings.push({ fatal: false, msg: `Grouping produced ${drafts.length} spawners (>200); check mergeRadius.` })

  $('summary').textContent = `— ${markers.length} markers, ${columns.length} columns, ${drafts.length} spots`
  renderWarnings(warnings)
  renderCards()
  $('resultsPanel').hidden = false
  $('yamlPanel').hidden = drafts.length === 0
}

function renderWarnings(warnings) {
  const box = $('warnings')
  box.innerHTML = ''
  if (!warnings.length) return
  const wrap = document.createElement('div')
  wrap.className = 'warnbox'
  for (const w of warnings) {
    const d = document.createElement('div')
    d.className = w.fatal ? 'fatal' : 'warn'
    d.textContent = `${w.fatal ? '[fatal] ' : '[warn] '}${w.msg}`
    wrap.appendChild(d)
  }
  box.appendChild(wrap)
}

function el(tag, cls, html) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  return e
}

// A labelled slider bound to a range + a synced number box. onChange gets the new value.
function slider(label, min, max, step, value, onChange) {
  const wrap = el('div', 'slider-row')
  wrap.appendChild(el('label', 'slabel', `${label} <span class="sval">${trimVal(value)}</span>`))
  const controls = el('div', 'scontrols')
  const range = document.createElement('input')
  range.type = 'range'; range.min = min; range.max = max; range.step = step; range.value = value
  const box = document.createElement('input')
  box.type = 'number'; box.min = min; box.max = max; box.step = step; box.value = value
  const valEl = wrap.querySelector('.sval')
  const apply = (v, from) => {
    let n = parseFloat(v)
    if (!Number.isFinite(n)) return
    n = Math.min(max, Math.max(min, n))
    if (from !== 'range') range.value = n
    if (from !== 'box') box.value = n
    valEl.textContent = trimVal(n)
    onChange(n)
  }
  range.addEventListener('input', () => apply(range.value, 'range'))
  box.addEventListener('input', () => apply(box.value, 'box'))
  controls.append(range, box)
  wrap.appendChild(controls)
  return wrap
}

function zoneSlider(label, zone, value, onChange) {
  const wrap = el('div', 'slider-row zone-slider')
  const labelEl = el('label', 'slabel', `${label} <span class="sval">${trimVal(value)}</span>`)

  wrap.appendChild(labelEl)

  const controls = el('div', 'scontrols')
  const rangeWrap = el('div', 'zone-range-wrap')

  const range = document.createElement('input')
  range.type = 'range'
  range.min = GLOBAL_ZONE_LEVEL_MIN
  range.max = GLOBAL_ZONE_LEVEL_MAX
  range.step = 1
  range.value = value
  range.className = 'zone-range'

  const zones = el('div', 'zone-background')

  Object.entries(ZONE_LEVELS).forEach(([name, z]) => {
    const segment = el('div', `zone-segment c-${name}`)
    const left = ((z.min - GLOBAL_ZONE_LEVEL_MIN) / (GLOBAL_ZONE_LEVEL_MAX - GLOBAL_ZONE_LEVEL_MIN)) * 100
    const width = ((z.max - z.min) / (GLOBAL_ZONE_LEVEL_MAX - GLOBAL_ZONE_LEVEL_MIN)) * 100
    segment.style.left = `${left}%`
    segment.style.width = `${width}%`
    zones.appendChild(segment)
  })

  const markers = el('div', 'zone-markers')

  Object.entries(ZONE_LEVELS).forEach(([name, z]) => {
    const marker = el('span', 'zone-marker', z.min)
    const left = ((z.min - GLOBAL_ZONE_LEVEL_MIN) / (GLOBAL_ZONE_LEVEL_MAX - GLOBAL_ZONE_LEVEL_MIN)) * 100
    marker.style.left = `${left}%`
    markers.appendChild(marker)
  })

  const maxMarker = el('span', 'zone-marker', GLOBAL_ZONE_LEVEL_MAX)

  maxMarker.style.left = '100%'
  markers.appendChild(maxMarker)

  rangeWrap.append(zones, range, markers)

  const box = document.createElement('input')
  box.type = 'number'
  box.min = zone.min
  box.max = zone.max
  box.step = 1
  box.value = value

  const valEl = wrap.querySelector('.sval')

  const apply = (v, from) => {
    let n = parseFloat(v)
    if (!Number.isFinite(n)) return

    n = Math.min(GLOBAL_ZONE_LEVEL_MAX, Math.max(GLOBAL_ZONE_LEVEL_MIN, n))
    n = Math.round(n)

    if (from !== 'range') range.value = n
    if (from !== 'box') box.value = n

    valEl.textContent = trimVal(n)
    onChange(n)
  }

  range.addEventListener('input', () => {
    apply(range.value, 'range')
    range.value = Math.min(GLOBAL_ZONE_LEVEL_MAX, Math.max(GLOBAL_ZONE_LEVEL_MIN, parseInt(range.value)))
  })

  box.addEventListener('input', () => {
    apply(box.value, 'box')
  })

  controls.append(rangeWrap, box)
  wrap.appendChild(controls)

  return wrap
}

function trimVal(v) { return Number.isInteger(v) ? String(v) : Number(v).toFixed(1) }

function renderCards() {
  const host = $('spots')
  host.innerHTML = ''
  drafts.forEach((d, i) => host.appendChild(buildCard(d, i)))
  renderYamlAll()
}

function buildCard(d, i) {
  const card = el('div', 'card')
  const yamlPre = el('pre', 'card-yaml')
  const refresh = () => { yamlPre.textContent = renderYaml(d); renderYamlAll() }

  const head = el('div', 'card-head')
  head.innerHTML =
    `<span class="dot c-${d.color}"></span>` +
    `<b>${d.name}</b>` +
    `<span class="coords">X ${d.x} · Y ${d.y} · Z ${d.z}</span>` +
    `<span class="meta">${d.color} · h=${d.maxColumnHeight} · markers=${d.mobCount}</span>`
  card.appendChild(head)

  const zone = d.zone || ZONE_LEVELS[d.color]
  const s = readSettings()
  const sliders = el('div', 'sliders')
  sliders.appendChild(slider('Radius', s.minSpawnRadius, Math.max(s.maxSpawnRadius, d.radius), 0.5, d.radius, v => { d.radius = v; refresh() }))
  sliders.appendChild(slider('RadiusY', 1, 16, 0.5, d.radiusY, v => { d.radiusY = v; refresh() }))
  sliders.appendChild(zoneSlider('MobLevel', zone, Number.isFinite(d.mobLevel) ? clampInt(d.mobLevel, GLOBAL_ZONE_LEVEL_MIN, GLOBAL_ZONE_LEVEL_MAX) : zone.max, v => { d.mobLevel = Math.round(v); refresh() }))
  sliders.appendChild(slider('MaxMobs', 1, Math.max(20, d.mobCount * 2, d.maxMobs), 1, d.maxMobs, v => { d.maxMobs = Math.round(v); refresh() }))
  card.appendChild(sliders)

  card.appendChild(buildMobPicker(d, refresh))
  card.appendChild(yamlPre)
  yamlPre.textContent = renderYaml(d)
  return card
}

function clampInt(v, lo, hi) { return Math.min(hi, Math.max(lo, Math.round(v || lo))) }

function buildMobPicker(d, refresh) {
  const box = el('div', 'mobs')
  box.appendChild(el('div', 'mob-title', 'Mobs — pick one or several (weighted list)'))
  const list = el('div', 'mob-list')
  box.appendChild(list)

  const nameLine = el('div', 'mobname')
  const syncName = () => {
    d.mobName = buildMobName(d.mobs)
    nameLine.innerHTML = `MobName: <code>${d.mobName || '(none)'}</code>`
  }

  const draw = () => {
    list.innerHTML = ''
    const pool = MOB_POOLS[d.color] || []
    const extras = d.mobs.map(m => m.id).filter(id => !pool.includes(id))
    for (const id of [...pool, ...extras]) {
      const sel = d.mobs.find(m => m.id === id)
      const row = el('label', 'mob-item' + (sel ? ' on' : ''))
      const cb = document.createElement('input')
      cb.type = 'checkbox'; cb.checked = !!sel
      const wt = document.createElement('input')
      wt.type = 'number'; wt.className = 'wt'; wt.min = 0; wt.step = 1; wt.placeholder = '%'
      wt.value = sel && sel.weight != null ? sel.weight : ''
      wt.disabled = !sel
      cb.addEventListener('change', () => {
        if (cb.checked) { if (!d.mobs.some(m => m.id === id)) d.mobs.push({ id, weight: null }) }
        else d.mobs = d.mobs.filter(m => m.id !== id)
        syncName(); refresh(); draw()
      })
      wt.addEventListener('input', () => {
        const m = d.mobs.find(x => x.id === id)
        if (m) { const n = parseFloat(wt.value); m.weight = Number.isFinite(n) ? n : null; syncName(); refresh() }
      })
      row.append(cb, el('span', 'mid', id), wt)
      list.appendChild(row)
    }
  }

  const add = el('div', 'mob-add')
  const custom = document.createElement('input')
  custom.type = 'text'; custom.placeholder = 'custom mob id…'
  const addBtn = el('button', 'ghost', 'Add')
  const doAdd = () => {
    const id = custom.value.trim()
    if (id && !d.mobs.some(m => m.id === id)) { d.mobs.push({ id, weight: null }); custom.value = ''; syncName(); refresh(); draw() }
  }
  addBtn.addEventListener('click', doAdd)
  custom.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd() } })
  add.append(custom, addBtn)

  box.append(nameLine, add)
  syncName()
  draw()
  return box
}

function renderYamlAll() {
  $('yaml').textContent = drafts.map(renderYaml).join('\n')
  scheduleSave()
}

function download(name, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ---------------------------------------------------------------------------------------------
// Minimal STORE (no compression) ZIP writer
// ---------------------------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function makeZip(files) {
  const enc = new TextEncoder()
  const chunks = []
  const central = []
  let offset = 0
  const u16 = v => [v & 0xff, (v >>> 8) & 0xff]
  const u32 = v => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]
  for (const f of files) {
    const nameBytes = enc.encode(f.name)
    const data = enc.encode(f.content)
    const crc = crc32(data)
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), ...u16(0),
    ]
    chunks.push(new Uint8Array(local), nameBytes, data)
    central.push({ nameBytes, crc, size: data.length, offset })
    offset += local.length + nameBytes.length + data.length
  }
  const centralChunks = []
  let centralSize = 0
  for (const c of central) {
    const rec = [
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(c.crc), ...u32(c.size), ...u32(c.size),
      ...u16(c.nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0),
      ...u32(c.offset),
    ]
    const recBytes = new Uint8Array(rec)
    centralChunks.push(recBytes, c.nameBytes)
    centralSize += recBytes.length + c.nameBytes.length
  }
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(central.length), ...u16(central.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ])
  return new Blob([...chunks, ...centralChunks, end], { type: 'application/zip' })
}

function exportZip() {
  if (!drafts.length) return
  const files = drafts.map(d => ({
    name: d.folder ? `${d.folder}/${d.name}.yml` : `${d.name}.yml`,
    content: renderYaml(d) + '\n',
  }))
  download('spawners.zip', makeZip(files))
}

// ---------------------------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------------------------
// ------------------------------------------------------------------ onblock tag chips
function onblockTokens() {
  return $('onBlockFilter').value.split(',').map(s => s.trim()).filter(Boolean)
}
function applyOnblock(tokens) {
  const value = tokens.join(',')
  $('onBlockFilter').value = value
  if (drafts.length) { // live-update already generated spots
    const filter = value || '#dirt'
    drafts.forEach(d => { d.onBlockFilter = filter })
    renderCards()
  }
  renderOnblockChips()
}
function renderOnblockChips() {
  const host = $('onblockChips')
  if (!host) return
  host.innerHTML = ''
  const active = new Set(onblockTokens())
  for (const tag of POPULAR_ONBLOCK) {
    const chip = el('button', 'chip' + (active.has(tag) ? ' on' : ''), tag)
    chip.type = 'button'
    chip.addEventListener('click', () => {
      const tokens = onblockTokens()
      const idx = tokens.indexOf(tag)
      if (idx >= 0) tokens.splice(idx, 1)
      else tokens.push(tag)
      applyOnblock(tokens)
    })
    host.appendChild(chip)
  }
}

function downloadCombined() {
  if (!drafts.length) return
  const content = drafts.map(renderYaml).join('\n\n') + '\n'
  const base = drafts[0].spawnerGroup || 'spawners'
  download(`${base}.yml`, new Blob([content], { type: 'text/yaml' }))
}

// ============================================================================================
// Fixme — re-name existing spawner folders so Difficulty follows the mob colour.
// ============================================================================================
let fixResults = []

function scanYamlBlocks(lines) {
  const blocks = []
  let cur = null
  lines.forEach((raw, i) => {
    const head = raw.match(/^([A-Za-z0-9_]+):\s*$/)
    if (head) { cur = { name: head[1], keyLine: i, sgLine: -1, mob: null }; blocks.push(cur); return }
    if (!cur) return
    const mob = raw.match(/^\s+MobName:\s*(.+?)\s*$/)
    if (mob && cur.mob === null) cur.mob = mob[1].trim().replace(/^'(.*)'$/, '$1')
    if (/^\s+SpawnerGroup:/.test(raw)) cur.sgLine = i
  })
  return blocks
}

function fixOneFile(text, zone, area, diffMap, counters) {
  const lines = text.split(/\r?\n/)
  const blocks = scanYamlBlocks(lines)
  const rows = []
  let outName = null
  for (const b of blocks) {
    const color = MOB_TO_CATEGORY[pureMobIds(b.mob || '')[0]] || null
    const diff = color ? (diffMap[color] || '?') : '?'
    const group = `${zone}_${area}_${diff}`
    counters[group] = (counters[group] || 0) + 1
    const newName = `${group}_${String(counters[group]).padStart(3, '0')}`
    lines[b.keyLine] = `${newName}:`
    if (b.sgLine >= 0) lines[b.sgLine] = `  SpawnerGroup: ${group}`
    rows.push({ old: b.name, new: newName, color: color || '?' })
    if (!outName) outName = newName
  }
  return { outName: outName || 'unnamed', content: lines.join('\n'), rows }
}

async function processFix(fileList) {
  const files = [...fileList].filter(f => /\.ya?ml$/i.test(f.name))
  if (!files.length) return
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const zone = $('fixZone').value.trim().toUpperCase() || 'ZONE'
  const area = $('fixArea').value.trim().toUpperCase() || 'FLD'
  const diffMap = difficultyByColor()
  const counters = {}
  fixResults = []
  for (const file of files) {
    const text = await file.text()
    fixResults.push(fixOneFile(text, zone, area, diffMap, counters))
  }
  renderFixPreview()
  $('fixDownload').disabled = fixResults.length === 0
  $('fixCount').textContent = `${fixResults.length} file(s) → ${Object.keys(counters).length} group(s)`
}

function renderFixPreview() {
  const host = $('fixPreview')
  host.innerHTML = ''
  const flat = fixResults.flatMap(r => r.rows)
  if (!flat.length) { host.innerHTML = '<p class="muted">Nothing loaded.</p>'; return }
  const byGroup = {}
  for (const r of flat) { const g = r.new.replace(/_\d+$/, ''); byGroup[g] = (byGroup[g] || 0) + 1 }
  const summary = el('div', 'fixsummary', Object.entries(byGroup).map(([g, n]) => `${g}: ${n}`).join('   '))
  host.appendChild(summary)
  for (const r of flat.slice(0, 300)) {
    const row = el('div', 'fixrow')
    row.innerHTML = `<span class="dot c-${r.color}"></span><span class="fold">${r.old}</span>` +
      `<span class="farr">→</span><span class="fnew">${r.new}</span>`
    host.appendChild(row)
  }
  if (flat.length > 300) host.appendChild(el('p', 'muted', `…and ${flat.length - 300} more`))
}

function downloadFix() {
  if (!fixResults.length) return
  const folder = $('fixFolder').value.trim()
  const files = fixResults.map(r => ({
    name: folder ? `${folder}/${r.outName}.yml` : `${r.outName}.yml`,
    content: r.content.endsWith('\n') ? r.content : r.content + '\n',
  }))
  download('spawners-fixed.zip', makeZip(files))
}

// Recursively collect files from a drag-drop that may include folders.
function walkEntry(entry, out) {
  return new Promise(resolve => {
    if (entry.isFile) {
      entry.file(f => { out.push(f); resolve() }, () => resolve())
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      const readBatch = () => reader.readEntries(async ents => {
        if (!ents.length) { resolve(); return }
        for (const en of ents) await walkEntry(en, out)
        readBatch()
      }, () => resolve())
      readBatch()
    } else {
      resolve()
    }
  })
}
async function filesFromDataTransfer(dt) {
  const items = dt.items ? [...dt.items] : []
  const entries = items.map(it => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null)).filter(Boolean)
  if (entries.length) {
    const out = []
    for (const e of entries) await walkEntry(e, out)
    return out
  }
  return [...dt.files]
}

// ============================================================================================
// Guide / reference tables, setup checklist, and the persistent Zones tracker.
// ============================================================================================
const MARKER_BLOCKS = [
  ['minecraft:lime_concrete', 'green'],
  ['minecraft:yellow_concrete', 'yellow'],
  ['minecraft:orange_concrete', 'orange'],
  ['minecraft:red_concrete', 'red'],
  ['minecraft:pink_concrete', 'pink'],
]
const DIRECTION_TEXT = { CENTER_HIGH: 'edge → low, center → high', EDGE_HIGH: 'edge → high, center → low' }

function renderReference() {
  const zt = $('zoneTable')
  if (zt) zt.innerHTML =
    '<tr><th>Zone</th><th>Level range</th><th>LeashRange</th><th>Cooldown</th><th>Level direction</th></tr>' +
    CATEGORIES.map(c => {
      const z = ZONE_LEVELS[c]
      return `<tr><td><span class="dot c-${c}"></span>${c} zone</td><td>${z.min}–${z.max}</td>` +
        `<td>${z.leash}</td><td>${z.cooldown}s</td><td>${DIRECTION_TEXT[z.dir]}</td></tr>`
    }).join('')
  const mt = $('mobTable')
  if (mt) mt.innerHTML =
    '<tr><th>Category</th><th>Mob ids</th></tr>' +
    CATEGORIES.map(c => `<tr><td><span class="dot c-${c}"></span>${c}</td><td class="mono">${MOB_POOLS[c].join(', ')}</td></tr>`).join('')
  const mk = $('markerTable')
  if (mk) mk.innerHTML =
    '<tr><th>Block</th><th>Category</th></tr>' +
    MARKER_BLOCKS.map(([b, c]) => `<tr><td class="mono">${b}</td><td><span class="dot c-${c}"></span>${c}</td></tr>`).join('')
}

const CK_KEY = 'spawnerbox.checklist'
function initChecklist() {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(CK_KEY) || '{}') } catch (_) { saved = {} }
  const boxes = document.querySelectorAll('#checklist input[type=checkbox]')
  boxes.forEach(cb => {
    cb.checked = !!saved[cb.dataset.k]
    cb.addEventListener('change', () => {
      const s = {}
      boxes.forEach(x => { s[x.dataset.k] = x.checked })
      try { localStorage.setItem(CK_KEY, JSON.stringify(s)) } catch (_) { /* ignore */ }
    })
  })
}

const ZONE_KEY = 'spawnerbox.zones'
function loadZones() { try { return JSON.parse(localStorage.getItem(ZONE_KEY) || '{}') } catch (_) { return {} } }
function saveZones(z) { try { localStorage.setItem(ZONE_KEY, JSON.stringify(z)) } catch (_) { /* ignore */ } }

function persistCurrent() {
  if (!drafts.length) return
  const group = drafts[0].batch || drafts[0].spawnerGroup || 'spawners'
  const z = loadZones()
  z[group] = {
    group,
    folder: drafts[0].folder,
    ready: z[group] ? z[group].ready : false,
    updated: Date.now(),
    drafts: JSON.parse(JSON.stringify(drafts)),
  }
  saveZones(z)
  renderZones()
}
let saveTimer = null
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persistCurrent, 500) }

function renderZones() {
  const host = $('zoneList')
  if (!host) return
  const groups = Object.values(loadZones()).sort((a, b) => b.updated - a.updated)
  $('zoneCount').textContent = groups.length ? `— ${groups.length} tracked` : ''
  if (!groups.length) {
    host.innerHTML = '<p class="muted">No zones yet — generate or load spawners and they show up here.</p>'
    return
  }
  host.innerHTML = ''
  for (const g of groups) {
    const row = el('div', 'zone-row' + (g.ready ? ' ready' : ''))
    const cb = document.createElement('input')
    cb.type = 'checkbox'; cb.checked = !!g.ready; cb.title = 'Mark this zone ready'
    cb.addEventListener('change', () => {
      const z = loadZones()
      if (z[g.group]) { z[g.group].ready = cb.checked; saveZones(z); renderZones() }
    })
    const name = el('span', 'zname', g.group)
    const meta = el('span', 'zmeta', `${g.drafts.length} spawners · ${new Date(g.updated).toLocaleString()}`)
    const open = el('button', 'ghost', 'Open')
    open.addEventListener('click', () => openZone(g.group))
    const del = el('button', 'ghost zdel', '✕')
    del.title = 'Remove from history'
    del.addEventListener('click', () => { const z = loadZones(); delete z[g.group]; saveZones(z); renderZones() })
    row.append(cb, name, meta, open, del)
    host.appendChild(row)
  }
}

function openZone(group) {
  const g = loadZones()[group]
  if (!g) return
  drafts = JSON.parse(JSON.stringify(g.drafts))
  if (g.folder != null) $('folder').value = g.folder
  $('summary').textContent = `— ${group}: ${drafts.length} spawner(s)`
  renderWarnings([])
  renderCards()
  $('resultsPanel').hidden = false
  $('yamlPanel').hidden = drafts.length === 0
  $('resultsPanel').scrollIntoView({ behavior: 'smooth' })
}

renderReference()
initChecklist()
renderZones()

$('generate').addEventListener('click', generate)

async function copyText(text) {
  // navigator.clipboard needs a secure context; falls back to execCommand for file:// / http.
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (_) { /* fall through */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try { ok = document.execCommand('copy') } catch (_) { ok = false }
  document.body.removeChild(ta)
  return ok
}

$('copy').addEventListener('click', async () => {
  const ok = await copyText($('yaml').textContent)
  const el = $('copied'); el.textContent = ok ? 'copied!' : 'press Ctrl+C'; setTimeout(() => (el.textContent = ''), 1800)
})
$('zip').addEventListener('click', exportZip)
$('combined').addEventListener('click', downloadCombined)
$('onBlockFilter').addEventListener('input', renderOnblockChips)
renderOnblockChips()
$('loadBtn').addEventListener('click', () => $('loadFile').click())
$('loadFile').addEventListener('change', e => { loadFiles(e.target.files); e.target.value = '' })

// Fixme wiring
$('fixPick').addEventListener('click', () => $('fixFiles').click())
$('fixPickDir').addEventListener('click', () => $('fixDir').click())
$('fixFiles').addEventListener('change', e => { processFix(e.target.files); e.target.value = '' })
$('fixDir').addEventListener('change', e => { processFix(e.target.files); e.target.value = '' })
$('fixDownload').addEventListener('click', downloadFix)
{
  const fdz = $('fixDrop')
  fdz.addEventListener('click', () => $('fixDir').click())
  ;['dragenter', 'dragover'].forEach(ev => fdz.addEventListener(ev, e => {
    if (!hasFiles(e)) return
    e.preventDefault(); e.stopPropagation(); fdz.classList.add('drag')
  }))
  ;['dragleave', 'dragend'].forEach(ev => fdz.addEventListener(ev, () => fdz.classList.remove('drag')))
  fdz.addEventListener('drop', async e => {
    e.preventDefault(); e.stopPropagation()
    fdz.classList.remove('drag')
    const files = await filesFromDataTransfer(e.dataTransfer)
    if (files.length) processFix(files)
  })
}

// ---- drag & drop: drop files anywhere on the page (and highlight the dropzone) ----
const dropzone = $('dropzone')
dropzone.addEventListener('click', () => $('loadFile').click())

function hasFiles(e) {
  return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
}
let dragDepth = 0
window.addEventListener('dragenter', e => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth++
  dropzone.classList.add('drag')
})
window.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } })
window.addEventListener('dragleave', e => {
  if (!hasFiles(e)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dropzone.classList.remove('drag')
})
window.addEventListener('drop', e => {
  const files = e.dataTransfer && e.dataTransfer.files
  dragDepth = 0
  dropzone.classList.remove('drag')
  if (files && files.length) { e.preventDefault(); loadFiles(files) }
})
$('markers').addEventListener('input', () => {
  const n = parseMarkers($('markers').value).length
  $('markerCount').textContent = n ? `${n} markers parsed` : ''
})
$('sample').addEventListener('click', () => {
  $('markers').value = [
    '214 74 -273 green', '214 75 -273 green', '215 74 -273 green', '216 75 -273 green',
    '218 74 -272 green', '220 74 -273 green',
    '260 70 -240 red', '260 71 -240 red', '261 70 -240 red',
    '300 80 -100 yellow', '301 80 -100 yellow', '302 81 -100 yellow', '303 80 -100 yellow',
  ].join('\n')
  $('markers').dispatchEvent(new Event('input'))
})
