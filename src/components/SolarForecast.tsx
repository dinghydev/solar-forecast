import { useEffect, useMemo, useState } from 'react'
import ChartCanvas from './ChartCanvas'
import { config } from '../api/config'
import { buildForecastUrl, fetchForecast } from '../api/fetchForecast'
import { fmt1, fmtLocalStamp, labelForDay, nowHourKey, todayIsoDate } from '../utils/format'

const verticalBarLabel = {
  id: 'verticalBarLabel',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.type !== 'bar') return
      meta.data.forEach((bar: any, i: number) => {
        const v = ds.data[i]
        if (v == null) return
        const text = (+v).toFixed(1)
        if (text === '0.0' || text === '-0.0') return
        ctx.save()
        ctx.translate(bar.x, bar.y - 4)
        ctx.rotate(-Math.PI / 2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#333'
        ctx.font = '10px -apple-system, "Segoe UI", sans-serif'
        ctx.fillText(text, 0, 0)
        ctx.restore()
      })
    })
  },
}

const MJ_SCALE = 3.6

function parseScale(scaleParam: string) {
  const scaleNumber = parseFloat(scaleParam)
  const scale = Number.isFinite(scaleNumber) ? scaleNumber : 1
  const unitLabel = scale === MJ_SCALE ? 'MJ/m²' : scale === 1 ? 'kWh/m²' : ''
  return { unitLabel, unitFactor: (1 / 3.6) * scale }
}

function withUnit(prefix: string, unitLabel: string) {
  return unitLabel ? `${prefix} (${unitLabel})` : prefix
}

function withQuery(pathname: string, mutate: (qs: URLSearchParams) => void): string {
  const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  mutate(qs)
  const query = qs.toString()
  return query ? `${pathname}?${query}` : pathname
}

function setParam(q: URLSearchParams, paramName: string, value: string, defaultValue: string) {
  if (value === defaultValue) {
    q.delete(paramName)
  } else {
    q.set(paramName, value)
  }
}

function presetLink(
  pathname: string,
  paramName: string,
  current: string,
  value: string,
  defaultValue: string,
  label: string = value,
) {
  return current === value ? (
    label
  ) : (
    <a href={withQuery(pathname, (q) => setParam(q, paramName, value, defaultValue))}>{label}</a>
  )
}

function useParamInput(
  paramName: string,
  currentValue: string,
  defaultValue: string,
  pathname: string,
) {
  const [input, setInput] = useState(currentValue)
  const apply = () => {
    const trimmed = input.trim()
    if (!trimmed || trimmed === currentValue) {
      setInput(currentValue)
      return
    }
    location.href = withQuery(pathname, (q) => setParam(q, paramName, trimmed, defaultValue))
  }
  return { input, setInput, apply }
}

export default function SolarForecast() {
  const qs = useMemo(
    () => new URLSearchParams(typeof location !== 'undefined' ? location.search : ''),
    [],
  )
  const pathname = typeof location !== 'undefined' ? location.pathname : '/'
  const currentTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const latitude = qs.get('lat') || config.defaultLatitude
  const longitude = qs.get('lon') || config.defaultLongitude
  const scaleParam = qs.get('scale') || config.defaultScale
  const forecastDays = qs.get('forecast_days') || config.defaultForecastDays
  const forecastHours = qs.get('forecast_hours') || config.defaultForecastHours
  const refreshMinutes = qs.get('refresh') || config.defaultRefreshMinutes

  const { unitLabel, unitFactor } = useMemo(() => parseScale(scaleParam), [scaleParam])
  const apiUrl = useMemo(
    () => buildForecastUrl({ latitude, longitude, forecastDays, timezone: currentTz }),
    [latitude, longitude, forecastDays, currentTz],
  )

  const [status, setStatus] = useState<{ kind: 'loading' | 'ok' | 'err'; text: string }>({
    kind: 'loading',
    text: 'Loading…',
  })
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [json, setJson] = useState<any>(null)
  const [fetchedAt, setFetchedAt] = useState('—')
  const scaleField = useParamInput('scale', scaleParam, config.defaultScale, pathname)
  const forecastDaysField = useParamInput(
    'forecast_days',
    forecastDays,
    config.defaultForecastDays,
    pathname,
  )
  const forecastHoursField = useParamInput(
    'forecast_hours',
    forecastHours,
    config.defaultForecastHours,
    pathname,
  )
  const refreshField = useParamInput(
    'refresh',
    refreshMinutes,
    config.defaultRefreshMinutes,
    pathname,
  )

  const loadForecast = async () => {
    setStatus({ kind: 'loading', text: 'Fetching Open-Meteo…' })
    setErrorDetails(null)
    try {
      const data = await fetchForecast(apiUrl)
      setJson(data)
      setFetchedAt(fmtLocalStamp(currentTz))
      setStatus({ kind: 'ok', text: `Loaded at ${fmtLocalStamp(currentTz)}` })
    } catch (err: any) {
      setErrorDetails(
        [
          'Step: fetch',
          `Error: ${err && err.message ? err.message : String(err)}`,
          `Request URL: ${apiUrl}`,
          `Time: ${fmtLocalStamp(currentTz)}`,
        ].join('\n'),
      )
      setStatus({ kind: 'err', text: 'Fetch failed — see details' })
    }
  }

  useEffect(() => {
    loadForecast()
    const refreshMs = Math.max(1, parseFloat(refreshMinutes) || 60) * 60 * 1000
    const interval = setInterval(loadForecast, refreshMs)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, refreshMinutes])

  const view = useMemo(() => {
    if (!json) return null
    const daily = json.daily || {}
    const time: string[] = daily.time || []
    if (!time.length) return null
    const ghiMJ = (daily.shortwave_radiation_sum || []).map((v: number) =>
      +((+v || 0) * unitFactor).toFixed(3),
    )
    const sunshineSec = daily.sunshine_duration || []
    const uvMax = daily.uv_index_max || []
    const tMax = daily.temperature_2m_max || []
    const tMin = daily.temperature_2m_min || []
    const labels = time.map(labelForDay)
    const sunshineHrs = sunshineSec.map((v: number) => +(v / 3600).toFixed(2))

    const todayDate = todayIsoDate(currentTz)
    let todayIdx = time.indexOf(todayDate)
    if (todayIdx < 0) todayIdx = 0

    const kpiData = [
      {
        label: 'Today GHI',
        value: fmt1(ghiMJ[todayIdx])
          ? `${fmt1(ghiMJ[todayIdx])}${unitLabel ? ` ${unitLabel}` : ''}`
          : '',
      },
      {
        label: 'Today Sunshine',
        value: fmt1(sunshineHrs[todayIdx]) ? `${fmt1(sunshineHrs[todayIdx])} h` : '',
      },
      { label: 'Today UV max', value: fmt1(uvMax[todayIdx]) },
      {
        label: 'Today Temp',
        value:
          fmt1(tMax[todayIdx]) || fmt1(tMin[todayIdx])
            ? `${fmt1(tMax[todayIdx]) || '—'}° / ${fmt1(tMin[todayIdx]) || '—'}° C`
            : '',
      },
    ]

    const dailyBg = time.map((_, i) =>
      i < todayIdx ? 'rgba(160, 160, 160, 0.7)' : 'rgba(255, 159, 64, 0.75)',
    )
    const dailyBorder = time.map((_, i) =>
      i < todayIdx ? 'rgba(120, 120, 120, 1)' : 'rgba(255, 140, 0, 1)',
    )

    const ghiChartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: withUnit('GHI', unitLabel),
            data: ghiMJ,
            backgroundColor: dailyBg,
            borderColor: dailyBorder,
            borderWidth: 1,
            yAxisID: 'y',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 34 } },
        plugins: {
          tooltip: { callbacks: { title: (items: any) => time[items[0].dataIndex] } },
          legend: { display: false },
        },
        scales: {
          y: {
            title: { display: true, text: withUnit('GHI', unitLabel) },
            min: Math.min(...ghiMJ),
            max: Math.max(...ghiMJ),
          },
        },
      },
      plugins: [verticalBarLabel],
    }

    // Hourly window
    const hourly = json.hourly || {}
    const hourlyTime: string[] = hourly.time || []
    const hourlySW = hourly.shortwave_radiation || []
    const hoursToShow = Math.max(1, parseInt(forecastHours, 10) || 72)
    const fmtHour = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const fmtHourDay = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const nowKey = nowHourKey(currentTz)

    const rawIso: string[] = []
    const rawMJ: number[] = []
    for (let i = 0; i < hourlyTime.length && rawIso.length < hoursToShow; i++) {
      rawIso.push(hourlyTime[i])
      rawMJ.push(+((hourlySW[i] || 0) * 0.0036 * unitFactor).toFixed(3))
    }

    const hLabels: string[] = []
    const hGhiMJ: number[] = []
    const hTooltipIso: string[] = []
    const hIsPast: boolean[] = []
    let prevDay = ''
    for (let i = 0; i < rawMJ.length; i++) {
      if (rawMJ[i] === 0) continue
      const iso = rawIso[i]
      const d = new Date(iso)
      const day = iso.slice(0, 10)
      const isDayStart = day !== prevDay
      prevDay = day
      hLabels.push(isDayStart ? fmtHourDay.format(d) : fmtHour.format(d))
      hGhiMJ.push(rawMJ[i])
      hTooltipIso.push(iso)
      hIsPast.push(iso < nowKey)
    }
    const hBg = hIsPast.map((p) => (p ? 'rgba(160, 160, 160, 0.7)' : 'rgba(245, 166, 35, 0.75)'))
    const hBorder = hIsPast.map((p) => (p ? 'rgba(120, 120, 120, 1)' : 'rgba(230, 140, 0, 1)'))

    const hourlyGhiChartConfig = {
      type: 'bar',
      data: {
        labels: hLabels,
        datasets: [
          {
            label: withUnit('Hourly GHI', unitLabel),
            data: hGhiMJ,
            backgroundColor: hBg,
            borderColor: hBorder,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 30 } },
        plugins: {
          tooltip: { callbacks: { title: (items: any) => hTooltipIso[items[0].dataIndex] } },
          legend: { display: false },
        },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 90, minRotation: 90 } },
          y: {
            title: { display: true, text: withUnit('GHI', unitLabel) },
            min: Math.min(...hGhiMJ),
            max: Math.max(...hGhiMJ),
          },
        },
      },
      plugins: [verticalBarLabel],
    }

    const sunUvChartConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sunshine (hours)',
            data: sunshineHrs,
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.25)',
            fill: true,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'UV Index Max',
            data: uvMax,
            borderColor: 'rgba(255, 205, 86, 1)',
            backgroundColor: 'rgba(255, 205, 86, 0.2)',
            fill: false,
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { title: (items: any) => time[items[0].dataIndex] } },
          legend: { display: false },
        },
        scales: {
          y: {
            title: { display: true, text: 'Sunshine (hours)', color: 'rgba(153, 102, 255, 1)' },
            ticks: { color: 'rgba(153, 102, 255, 1)' },
            min: Math.min(...sunshineHrs),
            max: Math.max(...sunshineHrs),
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'UV Index Max', color: 'rgba(230, 170, 30, 1)' },
            ticks: { color: 'rgba(230, 170, 30, 1)' },
            min: Math.min(...uvMax),
            grid: { drawOnChartArea: false },
            max: Math.max(...uvMax),
          },
        },
      },
    }

    const tempChartConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temp max (°C)',
            data: tMax,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.15)',
            fill: '+1',
            tension: 0.3,
          },
          {
            label: 'Temp min (°C)',
            data: tMin,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.15)',
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { title: (items: any) => time[items[0].dataIndex] } },
          legend: { display: false },
        },
        scales: {
          y: {
            title: { display: true, text: 'Temperature (°C)' },
            min: Math.min(...tMin),
            max: Math.max(...tMax),
          },
        },
      },
    }

    const tableRows = time.map((iso, i) => ({
      iso,
      label: labels[i],
      ghi: (ghiMJ[i] ?? 0).toFixed(1),
      sunshine: sunshineHrs[i].toFixed(1),
      uv: (uvMax[i] ?? 0).toFixed(1),
      tMax: (tMax[i] ?? 0).toFixed(1),
      tMin: (tMin[i] ?? 0).toFixed(1),
    }))

    return {
      kpiData,
      ghiChartConfig,
      hourlyGhiChartConfig,
      sunUvChartConfig,
      tempChartConfig,
      tableRows,
      hoursToShow,
    }
  }, [json, unitFactor, unitLabel, forecastHours, currentTz])

  const gridLat = json?.latitude
  const gridLon = json?.longitude

  return (
    <div>
      <div className="header-bar">
        <div className={`status ${status.kind}`}>
          <span className="dot" />
          <span>{status.text}</span>
        </div>
      </div>

      {view && (
        <div className="kpis">
          {view.kpiData.map((k) => (
            <div className="kpi" key={k.label}>
              <div className="label">{k.label}</div>
              <div className="value">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {errorDetails && (
        <div className="error-box">
          <strong>Fetch failed.</strong>
          <pre>{errorDetails}</pre>
        </div>
      )}

      {view && (
        <div>
          <details className="collapsible" open>
            <summary>
              <h2>Hourly GHI — {view.hoursToShow} h from yesterday</h2>
            </summary>
            <ChartCanvas config={view.hourlyGhiChartConfig} />
          </details>

          <details className="collapsible" open>
            <summary>
              <h2>Daily Global Horizontal Irradiation (GHI)</h2>
            </summary>
            <ChartCanvas config={view.ghiChartConfig} />
          </details>

          <details className="collapsible" open>
            <summary>
              <h2>Daily Temperature Range</h2>
            </summary>
            <ChartCanvas config={view.tempChartConfig} />
          </details>

          <details className="collapsible" open>
            <summary>
              <h2>Sunshine Duration &amp; UV Index Max</h2>
            </summary>
            <ChartCanvas config={view.sunUvChartConfig} />
          </details>

          <details className="collapsible">
            <summary>
              <h2>Raw Forecast Data</h2>
            </summary>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{withUnit('GHI', unitLabel)}</th>
                  <th>Sunshine (h)</th>
                  <th>UV max</th>
                  <th>Temp max (°C)</th>
                  <th>Temp min (°C)</th>
                </tr>
              </thead>
              <tbody>
                {view.tableRows.map((r) => (
                  <tr key={r.iso}>
                    <td title={r.iso}>{r.label}</td>
                    <td>{r.ghi}</td>
                    <td>{r.sunshine}</td>
                    <td>{r.uv}</td>
                    <td>{r.tMax}</td>
                    <td>{r.tMin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}

      <footer>
        <p>
          <strong>Source code:</strong>{' '}
          <a href="https://github.com/dinghydev/solar-forecast" target="_blank" rel="noopener noreferrer">
            github.com/dinghydev/solar-forecast
          </a>
        </p>
        <p>
          <strong>Source data:</strong>{' '}
          <a href={apiUrl} target="_blank" rel="noopener noreferrer">
            Open-Meteo forecast request
          </a>
        </p>
        <p>
          <strong>Fetched:</strong> {fetchedAt}
        </p>
        <p>
          <strong>Timezone:</strong> {json?.timezone || currentTz}
          {json?.timezone_abbreviation ? ` (${json.timezone_abbreviation})` : ''}
          {json?.utc_offset_seconds != null ? `, UTC offset ${json.utc_offset_seconds} s` : ''}
        </p>
        <p>
          <strong>Elevation:</strong> {json?.elevation != null ? `${json.elevation} m` : '—'}
        </p>
        <p>
          <strong>Grid:</strong>{' '}
          {gridLat != null && gridLon != null ? (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(gridLat)},${encodeURIComponent(gridLon)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {gridLat}°N, {gridLon}°E
            </a>
          ) : (
            '—'
          )}
        </p>
        <p>
          <strong>Scale:</strong>{' '}
          {presetLink(pathname, 'scale', scaleParam, '1', config.defaultScale, 'kWh/m²')}
          {' · '}
          {presetLink(
            pathname,
            'scale',
            scaleParam,
            String(MJ_SCALE),
            config.defaultScale,
            'MJ/m²',
          )}
          <input
            type="text"
            size={4}
            inputMode="decimal"
            className="scale-input"
            value={scaleField.input}
            onChange={(e) => scaleField.setInput(e.target.value)}
            onBlur={scaleField.apply}
            onKeyDown={(e) => {
              if (e.key === 'Enter') scaleField.apply()
            }}
          />
        </p>
        <p>
          <strong>Forecast Days:</strong>{' '}
          {presetLink(pathname, 'forecast_days', forecastDays, '7', config.defaultForecastDays)}
          {' · '}
          {presetLink(pathname, 'forecast_days', forecastDays, '14', config.defaultForecastDays)}
          <input
            type="text"
            size={4}
            inputMode="numeric"
            className="scale-input"
            value={forecastDaysField.input}
            onChange={(e) => forecastDaysField.setInput(e.target.value)}
            onBlur={forecastDaysField.apply}
            onKeyDown={(e) => {
              if (e.key === 'Enter') forecastDaysField.apply()
            }}
          />
        </p>
        <p>
          <strong>Forecast Hours:</strong>{' '}
          {presetLink(
            pathname,
            'forecast_hours',
            forecastHours,
            '72',
            config.defaultForecastHours,
          )}
          {' · '}
          {presetLink(
            pathname,
            'forecast_hours',
            forecastHours,
            '96',
            config.defaultForecastHours,
          )}
          <input
            type="text"
            size={4}
            inputMode="numeric"
            className="scale-input"
            value={forecastHoursField.input}
            onChange={(e) => forecastHoursField.setInput(e.target.value)}
            onBlur={forecastHoursField.apply}
            onKeyDown={(e) => {
              if (e.key === 'Enter') forecastHoursField.apply()
            }}
          />
        </p>
        <p>
          <strong>Refresh:</strong>{' '}
          {['10', '30', '60'].map((m, i) => (
            <span key={m}>
              {i > 0 ? ' · ' : ''}
              {presetLink(pathname, 'refresh', refreshMinutes, m, config.defaultRefreshMinutes)}
            </span>
          ))}
          <input
            type="text"
            size={4}
            inputMode="numeric"
            className="scale-input"
            value={refreshField.input}
            onChange={(e) => refreshField.setInput(e.target.value)}
            onBlur={refreshField.apply}
            onKeyDown={(e) => {
              if (e.key === 'Enter') refreshField.apply()
            }}
          />{' '}
          minutes
        </p>
        <p>
          Open-Meteo combines multiple national weather models (ECMWF, DWD ICON, NCEP GFS, UK Met
          Office, and others) into a best-match 14-day forecast blend.
        </p>
        <p>
          Weather data by{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">
            Open-Meteo.com
          </a>{' '}
          (CC-BY 4.0).
        </p>
      </footer>
    </div>
  )
}
