import { render } from 'preact'
import '../styles/global.css'
import '../styles/nodes.css'
import { App } from './App'
import { LocaleProvider, ProjectProvider, StoreProvider, ThemeProvider, TitleProvider, VersionProvider } from './contexts'

function Main() {
	return (
		<StoreProvider>
			<LocaleProvider>
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
		</StoreProvider>
	)
}

render(<Main />, document.body)
