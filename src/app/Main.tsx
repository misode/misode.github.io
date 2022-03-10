import { render } from 'preact'
import '../styles/global.css'
import '../styles/nodes.css'
import { App } from './App'
import { LocaleProvider, ProjectProvider, ThemeProvider, TitleProvider, VersionProvider } from './contexts'
import './FeatureDetection'

function Main() {
	return <LocaleProvider>
		<ThemeProvider>
			<VersionProvider>
				<TitleProvider>
					<ProjectProvider>
						<App />
					</ProjectProvider>
				</TitleProvider>
			</VersionProvider>
		</ThemeProvider>
	</LocaleProvider>
}

render(<Main />, document.body)
