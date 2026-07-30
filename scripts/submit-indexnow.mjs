import { access, readFile } from 'node:fs/promises'

const host = 'picoworker.xyz'
const origin = `https://${host}`
const key = (await readFile(new URL('../.indexnow-key', import.meta.url), 'utf8')).trim()

if (!/^[a-f0-9-]{8,128}$/i.test(key)) {
  throw new Error('The IndexNow key file is missing or invalid.')
}

const publicKeyFile = new URL(`../public/${key}.txt`, import.meta.url)
await access(publicKeyFile)

const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const urlList = [...sitemap.matchAll(/<loc>(https:\/\/picoworker\.xyz\/[^<]*)<\/loc>/g)].map((match) => match[1])

if (!urlList.length) {
  throw new Error('No canonical PicoWorker URLs were found in public/sitemap.xml.')
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `${origin}/${key}.txt`,
    urlList,
  }),
})

if (!response.ok) {
  const details = (await response.text()).slice(0, 500)
  throw new Error(`IndexNow returned HTTP ${response.status}${details ? `: ${details}` : ''}`)
}

console.log(`Submitted ${urlList.length} canonical URLs to IndexNow.`)
