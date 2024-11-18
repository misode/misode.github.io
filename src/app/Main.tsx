import { render } from 'preact'
import '../styles/global.css'
import '../styles/main.css'
import '../styles/nodes.css'
import { App } from './App.js'
import { LocaleProvider, ProjectProvider, StoreProvider, ThemeProvider, TitleProvider, VersionProvider } from './contexts/index.js'
import { ModalProvider } from './contexts/Modal.jsx'
import { SpyglassProvider } from './contexts/Spyglass.jsx'

function Main() {
	return (
		<StoreProvider>
			<LocaleProvider>
				<ThemeProvider>
					<VersionProvider>
						<TitleProvider>
							<SpyglassProvider>
								<ProjectProvider>
									<ModalProvider>
										<App />
									</ModalProvider>
								</ProjectProvider>
							</SpyglassProvider>
						</TitleProvider>
					</VersionProvider>
				</ThemeProvider>
			</LocaleProvider>
		</StoreProvider>
	)
}

render(<Main />, document.body)
