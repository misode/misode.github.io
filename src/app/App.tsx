import type { RouterOnChangeArgs } from 'preact-router'
import { Router } from 'preact-router'
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import '../styles/global.css'
import '../styles/nodes.css'
import { Analytics } from './Analytics.js'
import { Header } from './components/index.js'
import { TextComponent } from './components/TextComponent.jsx'
import { Changelog, Customized, Generator, Generators, Guide, Guides, Home, LegacyPartners, Partners, Sounds, Transformation, Versions, WhatsNew, Worldgen } from './pages/index.js'
import { cleanUrl } from './Utils.js'

const DEMO_KEY = 'misode_demo_2024'
const DEMO_INITIAL_SECONDS = 300

export function App() {
	const changeRoute = (e: RouterOnChangeArgs) => {
		window.dispatchEvent(new CustomEvent('replacestate'))
		// Needs a timeout to ensure the title is set correctly
		setTimeout(() => Analytics.pageview(cleanUrl(e.url)))
	}

	const [demoTimer, setDemoTimer] = useState(DEMO_INITIAL_SECONDS)

	useEffect(() => {
		const storedKey = localStorage.getItem(DEMO_KEY)
		if (storedKey !== null) {
			setDemoTimer(parseInt(storedKey))
		}
		const interval = setInterval(() => {
			setDemoTimer(timer => {
				const newTimer = Math.max(0, timer - 1)
				localStorage.setItem(DEMO_KEY, newTimer.toFixed())
				return newTimer
			})
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	const resetDemo = useCallback(() => {
		setDemoTimer(DEMO_INITIAL_SECONDS)
	}, [])

	const formattedRemainingTime = useMemo(() => {
		const minutes = Math.floor(demoTimer / 60).toFixed().padStart(2, '0')
		const seconds = (demoTimer % 60).toFixed().padStart(2, '0')
		return `${minutes}:${seconds}`
	}, [demoTimer])

	return <>
		<Header />
		<Router onChange={changeRoute}>
			<Home path="/" />
			<Generators path="/generators" />
			<Worldgen path="/worldgen" />
			<Partners path="/partners" />
			<LegacyPartners path="/partners/:id" />
			<Sounds path="/sounds" />
			<Changelog path="/changelog" />
			<Versions path="/versions" />
			<Transformation path="/transformation" />
			<Customized path="/customized" />
			<WhatsNew path="/whats-new" />
			<Guides path="/guides" />
			<Guide path="/guides/:id" />
			<Generator default />
		</Router>
		<div class={`fixed z-[10000] ${demoTimer > 0 ? 'bottom-1' : 'top-1/2 -translate-y-1/2'} left-1/2 -translate-x-1/2 max-w-[100vw]`}>
			<div class={`${demoTimer > 0 ? 'px-2 py-1' : 'p-6'} flex flex-col 	items-center item-tooltip ${0 < demoTimer && demoTimer < 60 ? 'motion-safe:animate-bounce' : ''} `}>
				{demoTimer > 0 ? <>
					<TextComponent component={{ text: 'This is a demo version!', color: 'yellow' }} />
					<TextComponent component={`Remaining time: ${formattedRemainingTime}`} />
				</> : <>
					<TextComponent component={{ text: 'Your free demo has ended!', color: 'yellow' }} />
					<div class="flex cursor-pointer px-4 py-1 mt-2 items-center bg-[#6f6f6f] border-black" style="box-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5) inset, -1px -2px 0 rgba(0, 0, 0, 0.3) inset;" onClick={resetDemo}>
						<img class="mr-2" src="/images/minecoin.png" alt="Minecoin" />
						<TextComponent component={{ text: 'Buy 5 more minutes' }} />
					</div>
				</>}
			</div>
		</div>
	</>
}
