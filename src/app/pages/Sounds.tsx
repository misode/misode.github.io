import { useEffect, useRef, useState } from 'preact/hooks'
import config from '../../config.json'
import { Btn, BtnMenu, ErrorPanel, SoundConfig, TextInput } from '../components'
import { useLocale, useTitle, useVersion } from '../contexts'
import type { SoundEvents, VersionId } from '../services'
import { fetchSounds } from '../services'
import { hexId, message } from '../Utils'

interface Props {
	path?: string,
}
export function Sounds({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	const [error, setError] = useState<string | null>(null)
	useTitle(locale('title.sounds'))

	const [sounds, setSounds] = useState<SoundEvents>({})
	const soundKeys = Object.keys(sounds ?? {})
	useEffect(() => {
		fetchSounds(version)
			.then(setSounds)
			.catch(e => { console.error(e); setError(message(e)) })
	}, [version])

	const [search, setSearch] = useState('')
	const [configs, setConfigs] = useState<SoundConfig[]>([])
	const addConfig = () => {
		setConfigs([{ id: hexId(), sound: search, delay: 0, pitch: 1, volume: 1 }, ...configs])
	}
	const editConfig = (id: string) => (changes: Partial<SoundConfig>) => {
		setConfigs(configs.map(c => c.id === id ? { ...c, ...changes } : c))
	}
	const deleteConfig = (id: string) => () => {
		setConfigs(configs.filter(c => c.id !== id))
	}

	const [delayedPlay, setDelayedPlay] = useState(0)
	const playAll = () => {
		setDelayedPlay(delayedPlay + 1)
	}

	const download = useRef<HTMLAnchorElement>(null)
	const downloadFunction = () => {
		const hasDelay = configs.some(c => c.delay > 0)
		const content = configs
			.sort((a, b) => a.delay - b.delay)
			.map(c => `${hasDelay ? `execute if score @s delay matches ${c.delay} run ` : ''}playsound minecraft:${c.sound} master @s ~ ~ ~ ${c.volume} ${c.pitch}`)
			.join('\n')
		download.current.setAttribute('href', 'data:text/plain;charset=utf-8,' + content + '%0A')
		download.current.setAttribute('download', 'sounds.mcfunction')
		download.current.click()
	}

	return <main>
		{error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
		{soundKeys.length > 0 && <>
			<div class="controls sounds-controls">
				<div class="sound-search-group">
					<TextInput class="btn btn-input sound-search" list="sound-list" placeholder={locale('sounds.search')}
						value={search} onChange={setSearch} onEnter={addConfig} />
					<Btn icon="plus" tooltip={locale('sounds.add_sound')} class="add-sound" onClick={addConfig} />
				</div>
				{configs.length > 1 && <Btn icon="play" label={ locale('sounds.play_all')} class="play-all-sounds" onClick={playAll} />}
				<div class="spacer"></div>
				<Btn icon="download" label={locale('download')} tooltip={locale('sounds.download_function')} class="download-sounds" onClick={downloadFunction} />
				<BtnMenu icon="tag" label={version}>
					{config.versions.reverse().map(v =>
						<Btn label={v.id} active={v.id === version} onClick={() => changeVersion(v.id as VersionId)} />
					)}
				</BtnMenu>
			</div>
			<div class="sounds">
				{configs.map(c => <SoundConfig key={c.id} {...c} {...{ sounds, delayedPlay }} onEdit={editConfig(c.id)} onDelete={deleteConfig(c.id)} />)}
			</div>
			<a ref={download} style="display: none;"></a>
		</>}
		<datalist id="sound-list">
			{soundKeys.map(s => <option key={s} value={s} />)}
		</datalist>
	</main>
}
