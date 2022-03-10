if (typeof BigInt !== 'function') {
	window.BigInt = (() => 0) as any
}
