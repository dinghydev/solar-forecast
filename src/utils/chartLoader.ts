const CHART_JS_SRC = 'https://cdn.jsdelivr.net/npm/chart.js'

let loadPromise: Promise<any> | null = null

// Chart.js loads via the same CDN <script> tag the original solar.html used,
// keeping this dinghy site free of an npm dependency on chart.js.
export function loadChartJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).Chart) return Promise.resolve((window as any).Chart)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHART_JS_SRC
    script.async = true
    script.onload = () => resolve((window as any).Chart)
    script.onerror = () => reject(new Error('Failed to load Chart.js from ' + CHART_JS_SRC))
    document.head.appendChild(script)
  })
  return loadPromise
}
