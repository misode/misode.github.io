export function Giscus() {
	const theme = (import.meta as any).env.DEV
		? 'http://localhost:3000/src/styles/giscus.css'
		: `https://${location.host}/assets/giscus.css`

	return <script src="https://giscus.app/client.js"
		data-repo="misode/misode.github.io"
		data-repo-id="MDEwOlJlcG9zaXRvcnkxOTIyNTQyMzA="
		data-category="Site"
		data-category-id="DIC_kwDOC3WRFs4COB8r"
		data-mapping="pathname"
		data-reactions-enabled="1"
		data-emit-metadata="0"
		data-input-position="top"
		data-theme={theme}
		data-lang="en"
		crossOrigin="anonymous"
		async>
	</script>
}
