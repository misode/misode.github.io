import type { Howl, HowlOptions } from 'howler'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Btn, ErrorPanel, Footer, SoundConfig, TextInput, VersionSwitcher } from '../components'
import { useLocale, useTitle, useVersion } from '../contexts'
import { useAsync } from '../hooks'
import { fetchSounds } from '../services'
import { hexId } from '../Utils'

interface Props {
	path?: string,
}
export function Sounds({}: Props) {
	const { locale } = useLocale()
	const { version, changeVersion } = useVersion()
	useTitle(locale('title.sounds'))

	const [howler, setHowler] = useState<undefined | ((options: HowlOptions) => Howl)>(undefined)
	useEffect(() => {
		(async () => {
			const howler = await import('howler')
			setHowler(() => (options: HowlOptions) => new howler.Howl(options))
		})()
	}, [])

	const { value: sounds, error } = useAsync(async () => {
		return await fetchSounds(version)
	}, [version])
	const soundKeys = useMemo(() => Object.keys(sounds ?? {}), [sounds])

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
		if (!download.current) return
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
		{error && <ErrorPanel error={error} />}
		{soundKeys.length > 0 && <>
			<div class="controls sounds-controls">
				<div class="sound-search-group">
					<TextInput class="btn btn-input sound-search" list="sound-list" placeholder={locale('sounds.search')}
						value={search} onChange={setSearch} onEnter={addConfig} />
					<Btn icon="plus" tooltip={locale('sounds.add_sound')} class="add-sound" onClick={addConfig} />
				</div>
				{configs.length > 1 && <Btn icon="play" label={ locale('sounds.play_all')} class="play-all-sounds" onClick={playAll} />}
				<div class="spacer"></div>
				<Btn icon="download" label={locale('download')} tooltip={locale('sounds.download_function')} tooltipLoc="se" class="download-sounds" onClick={downloadFunction} />
				<VersionSwitcher value={version} onChange={changeVersion} />
			</div>
			<div class="sounds">
				{sounds && howler && configs.map(c =>
					<SoundConfig key={c.id} {...c} {...{ howler, sounds, delayedPlay }} onEdit={editConfig(c.id)} onDelete={deleteConfig(c.id)} />
				)}
			</div>
			<a ref={download} style="display: none;"></a>
			<datalist id="sound-list">
				{soundKeys.map(s => <option key={s} value={s} />)}
			</datalist>
		</>}
		<Footer donate={false} />
	</main>
}
