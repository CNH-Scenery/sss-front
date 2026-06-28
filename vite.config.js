import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const UPBIT_API_BASE = 'https://api.upbit.com/v1'
const MAX_DAILY_CANDLE_COUNT = 200

function toUpbitCursor(utcText) {
  const date = new Date(utcText + 'Z')
  date.setSeconds(date.getSeconds() - 1)
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

async function fetchUpbitDailyRows(market, days) {
  const rows = []
  let to = ''

  while (rows.length < days) {
    const count = Math.min(MAX_DAILY_CANDLE_COUNT, days - rows.length)
    const params = new URLSearchParams({ market, count: String(count) })
    if (to) params.set('to', to)

    const response = await fetch(`${UPBIT_API_BASE}/candles/days?${params.toString()}`)
    if (!response.ok) throw new Error(`Upbit responded with HTTP ${response.status}`)

    const page = await response.json()
    if (!Array.isArray(page) || page.length === 0) break

    rows.push(...page)
    const oldest = page[page.length - 1]
    if (!oldest?.candle_date_time_utc || page.length < count) break

    to = toUpbitCursor(oldest.candle_date_time_utc)
    await new Promise((resolve) => setTimeout(resolve, 120))
  }

  return rows.slice(0, days)
}

function localUpbitApi() {
  return {
    name: 'local-upbit-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/upbit/daily')) return next()

        try {
          const url = new URL(req.url, 'http://localhost')
          const market = (url.searchParams.get('market') || 'KRW-BTC').trim().toUpperCase()
          const days = Math.max(1, Math.min(500, Number(url.searchParams.get('days') || 365)))
          const rows = await fetchUpbitDailyRows(market, days)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(rows))
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: { message: error?.message || 'Upbit request failed' } }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localUpbitApi()],
  server: {
    port: 5173,
    proxy: {
      '/upbit': {
        target: 'https://api.upbit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upbit/, ''),
      },
      // 그 외 /api/* 는 백엔드(sss-back, :8000)로 전달. 코드생성(Claude)·인증 등.
      // (/api/upbit/daily 는 위 localUpbitApi 미들웨어가 먼저 가로채 로컬 처리.)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
