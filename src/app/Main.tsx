import { render } from 'preact'
import '../styles/global.css'
import '../styles/nodes.css'
import { App } from './App'
import { LocaleProvider, ThemeProvider, TitleProvider, VersionProvider } from './contexts'

function Main() {
	return <LocaleProvider>
		<ThemeProvider>
			<VersionProvider>
				<TitleProvider>
					<App />
				</TitleProvider>
			</VersionProvider>
		</ThemeProvider>
	</LocaleProvider>
}

render(<Main />, document.body)
