import { render } from 'preact'
import '../styles/global.css'
import '../styles/nodes.css'
import { App } from './App'
import { LocaleProvider } from './contexts'

function Main() {
	return <LocaleProvider>
		<App />
	</LocaleProvider>
}

render(<Main />, document.body)
