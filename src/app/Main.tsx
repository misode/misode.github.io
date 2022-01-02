import { render } from 'preact'
import '../styles/global.css'
import '../styles/nodes.css'
import { App } from './App'
import { LocaleProvider, ThemeProvider } from './contexts'

function Main() {
	return <LocaleProvider>
		<ThemeProvider>
			<App />
		</ThemeProvider>
	</LocaleProvider>
}

render(<Main />, document.body)
