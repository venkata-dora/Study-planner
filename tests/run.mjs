import { build } from 'esbuild'
for (const entry of ['tests/learningProgress.test.js', 'tests/learningPages.test.jsx']) {
  const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', define: { 'import.meta.env.VITE_DJANGO_API': '"false"' }, write: false })
  const { createRequire } = await import('node:module')
  new Function('require', result.outputFiles[0].text)(createRequire(import.meta.url))
}
