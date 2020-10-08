const dec2hex = (dec: number) => ('0' + dec.toString(16)).substr(-2)

export function hexId(length = 12) {
  var arr = new Uint8Array(length / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}
