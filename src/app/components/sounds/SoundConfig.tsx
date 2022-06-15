import type { Howl, HowlOptions } from 'howler'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale, useVersion } from '../../contexts/index.js'
import type { SoundEvents } from '../../services/index.js'
import { getSoundUrl } from '../../services/index.js'
import { Btn, NumberInput, RangeInput, TextInput } from '../index.js'

export interface SoundConfig {
	id: string,
	sound: string,
	delay: number,
	pitch: number,
	volume: number,
}
type SoundConfigProps = SoundConfig & {
	howler: (options: HowlOptions) => Howl,
	sounds: SoundEvents,
	onEdit: (changes: Partial<SoundConfig>) => unknown,
	onDelete: () => unknown,
	delayedPlay?: number,
}
export function SoundConfig({ howler, sounds, sound, delay, pitch, volume, onEdit, onDelete, delayedPlay }: SoundConfigProps) {
	const { locale } = useLocale()
	const { version } = useVersion()
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
			const url = getSoundUrl(version, soundPath)
			const howl = howler({
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
		<Btn class="play" icon={invalid ? 'alert' : loading ? 'sync' : 'play'} label={locale('sounds.play')} onClick={play} tooltip={invalid ? locale('sounds.unknown_sound') : loading ? locale('sounds.loading_sound') : locale('sounds.play_sound')} tooltipLoc="se" />
		<TextInput class="btn btn-input sound" list="sound-list" spellcheck={false}
			value={sound} onChange={sound => onEdit({ sound })} />
		<label class="delay-label">{locale('sounds.delay')}: </label>
		<NumberInput class="btn btn-input delay" min={0}
			value={delay} onChange={delay => onEdit({ delay })} />
		<label class="pitch-label">{locale('sounds.pitch')}: </label>
		<RangeInput class="pitch tooltipped tip-s" min={0.5} max={2} step={0.01}
			aria-label={pitch.toFixed(2)} style={`--x: ${(pitch - 0.5) * (100 / 1.5)}%`}
			value={pitch} onChange={pitch => onEdit({ pitch })} />
		<label class="volume-label">{locale('sounds.volume')}: </label>
		<RangeInput class="volume tooltipped tip-s" min={0} max={1} step={0.01}
			aria-label={volume.toFixed(2)} style={`--x: ${volume * 100}%`}
			value={volume} onChange={volume => onEdit({ volume })} />
		<Btn class={`copy${copyActive ? ' active' : ''}`} icon={copyActive ? 'check' : 'terminal'} label={locale('copy')} tooltip={copyActive ? locale('copied') : locale('sounds.copy_command')}
			onClick={copy} />
		<Btn class="remove" icon="trashcan" tooltip={locale('sounds.remove_sound')}
			onClick={() => {onDelete(); stop()}} />
	</div>
}
