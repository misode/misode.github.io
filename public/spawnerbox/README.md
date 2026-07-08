# Spawner Box Generator — standalone tool

A self-contained web tool that turns coloured concrete marker blocks into MythicMobs
*Spawners* YAML. It mirrors the in-game `/spawnerbox` command and needs **no build step and
no running Minecraft server**.

## Run it (pick one)

### 1. Double-click (easiest)
- **Windows:** double-click `start.bat`
- **macOS / Linux:** `./start.sh`

This starts a tiny built-in Node server (no `npm install`) on
<http://localhost:4599/> and opens your browser. Stop it with `Ctrl+C`.

### 2. One command
From this folder:
```bash
node serve.mjs           # http://localhost:4599/
node serve.mjs 8080      # custom port
```
Or with any static server, e.g. `py -m http.server 4599` (then open
<http://localhost:4599/>).

### 3. Open the file directly
Just open `index.html` in a browser (`file://`). Everything works offline; the only
caveat is that some browsers block the clipboard on `file://`, so "Copy YAML" falls back
to selecting the text for a manual `Ctrl+C`.

## Usage
1. Paste markers as `x y z colour` per line (or a JSON array of `{x,y,z,color}`), or click
   **Load sample**.
2. Adjust settings (folder, zone/area/difficulty, `mergeRadius`, radius formula, ...).
3. **Generate spots** → review/edit Radius, RadiusY, MaxMobs, Level and MobName per spot.
4. **Copy YAML** or **Export .zip** (files land under `folder/NAME.yml`).

The tool is also served by the full frontend (Vite) at `/spawnerbox/`.
