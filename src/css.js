// Converts an inline CSS string ("a:b;c:d") into a React style object.
// Lets us keep the original design's style strings nearly verbatim.
export function css(str) {
  const o = {}
  if (!str) return o
  String(str).split(';').forEach((decl) => {
    const i = decl.indexOf(':')
    if (i < 0) return
    let k = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (!k) return
    k = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    o[k] = val
  })
  return o
}
