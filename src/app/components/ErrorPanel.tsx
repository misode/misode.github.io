export function ErrorPanel({ error }: { error: string }) {
	return <div class="error">
		<h3>{error}</h3>
		<p>You can report this as a bug <a href="https://github.com/misode/misode.github.io/issues/new" target="_blank">on GitHub</a></p>
	</div>
}
