import { Howl } from 'howler'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Btn, NumberInput, RangeInput, TextInput } from '..'
import { getResourceUrl } from '../../DataFetcher'
import { locale } from '../../Locales'
import type { SoundEvents, VersionAssets } from '../../Manifest'

export interface SoundConfig {
	id: string,
	sound: string,
	delay: number,
	pitch: number,
	volume: number,
}
type SoundConfigProps = SoundConfig & {
	lang: string,
	assets: VersionAssets,
	sounds: SoundEvents,
	onEdit: (changes: Partial<SoundConfig>) => unknown,
	onDelete: () => unknown,
	delayedPlay?: number,
}
export function SoundConfig({ lang, assets, sounds, sound, delay, pitch, volume, onEdit, onDelete, delayedPlay }: SoundConfigProps) {
	const loc = locale.bind(null, lang)
	const [loading, setLoading] = useState(true)
	const [playing, setPlaying] = useState(false)
	const [invalid, setInvalid] = useState(false)
	const howls = useRef<Howl[]>([])
	const command = `playsound minecraft:${sound} master @s ~ ~ ~ ${volume} ${pitch}`

	useEffect(() => {
		const soundEvent = sounds[sound]
		setInvalid((soundEvent?.sounds?.length ?? 0) === 0)
		howls.current.forEach(h => h.stop())
		howls.current = (soundEvent?.sounds ?? []).map(entry => {
			const soundPath = typeof entry === 'string' ? entry : entry.name
			const hash = assets[`minecraft/sounds/${soundPath}.ogg`].hash
			const url = getResourceUrl(hash)
			const howl = new Howl({
				src: [url],
				format: ['ogg'],
				volume,
				rate: pitch,
			})
			howl.on('end', () => {
				setPlaying(false)
			})
			const completed = () => {
				if (loading && howls.current.every(h => h.state() === 'loaded')) {
					setLoading(false)
				}
			}
			if (howl.state() === 'loaded') {
				setTimeout(() => completed())
			} else {
				howl.on('load', () => {
					completed()
				})
			}
			return howl
		})
		setLoading(true)
	}, [sound, sounds])

	useEffect(() => {
		howls.current.forEach(h => h.rate(pitch))
	}, [pitch])

	useEffect(() => {
		howls.current.forEach(h => h.volume(volume))
	}, [volume])

	const play = () => {
		if (loading || invalid) return
		stop()
		const howl = Math.floor(Math.random() * howls.current.length)
		howls.current[howl].play()
		setPlaying(true)
	}
	const stop = () => {
		howls.current.forEach(h => h.stop())
	}
	useEffect(() => {
		if (delayedPlay) setTimeout(() => play(), delay * 50)
	}, [delayedPlay])

	useEffect(() => {
		return () => stop()
	}, [])

	const [copyActive, setCopyActive] = useState(false)
	const copyTimeout = useRef<number | undefined>(undefined)
	const copy = () => {
		navigator.clipboard.writeText(command)
		setCopyActive(true)
		if (copyTimeout.current !== undefined) clearTimeout(copyTimeout.current)
		copyTimeout.current = setTimeout(() => {
			setCopyActive(false)
		}, 2000) as any
	}

	return <div class={`sound-config${loading ? ' loading' : playing ? ' playing' : ''}${invalid ? ' invalid' : ''}`}>
		<Btn class="play" icon={invalid ? 'alert' : loading ? 'sync' : 'play'} label={loc('sounds.play')} onClick={play} tooltip={invalid ? loc('sounds.unknown_sound') : loading ? loc('sounds.loading_sound') : loc('sounds.play_sound')} tooltipLoc="se" />
		<TextInput class="btn btn-input sound" list="sound-list" spellcheck={false}
			value={sound} onChange={sound => onEdit({ sound })} />
		<label class="delay-label">{loc('sounds.delay')}: </label>
		<NumberInput class="btn btn-input delay" min={0}
			value={delay} onChange={delay => onEdit({ delay })} />
		<label class="pitch-label">{loc('sounds.pitch')}: </label>
		<RangeInput class="pitch tooltipped tip-s" min={0.5} max={2} step={0.01}
			aria-label={pitch.toFixed(2)} style={`--x: ${(pitch - 0.5) * (100 / 1.5)}%`}
			value={pitch} onChange={pitch => onEdit({ pitch })} />
		<label class="volume-label">{loc('sounds.volume')}: </label>
		<RangeInput class="volume tooltipped tip-s" min={0} max={1} step={0.01}
			aria-label={volume.toFixed(2)} style={`--x: ${volume * 100}%`}
			value={volume} onChange={volume => onEdit({ volume })} />
		<Btn class={`copy${copyActive ? ' active' : ''}`} icon={copyActive ? 'check' : 'terminal'} label={loc('copy')} tooltip={copyActive ? loc('copied') : loc('sounds.copy_command')}
			onClick={copy} />
		<Btn class="remove" icon="trashcan" tooltip={loc('sounds.remove_sound')}
			onClick={() => {onDelete(); stop()}} />
	</div>
}
