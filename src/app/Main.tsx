import { render } from 'preact'
import '../styles/global.css'
import '../styles/nodes.css'
import { App } from './App'
import { LocaleProvider, ThemeProvider, VersionProvider } from './contexts'

function Main() {
	return <LocaleProvider>
		<ThemeProvider>
			<VersionProvider>
				<App />
			</VersionProvider>
		</ThemeProvider>
	</LocaleProvider>
}

render(<Main />, document.body)
