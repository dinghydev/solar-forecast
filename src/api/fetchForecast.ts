export interface ForecastRequest {
  latitude: string
  longitude: string
  forecastDays: string
  timezone: string
}

export function buildForecastUrl({
  latitude,
  longitude,
  forecastDays,
  timezone,
}: ForecastRequest): string {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily:
      'shortwave_radiation_sum,sunshine_duration,uv_index_max,temperature_2m_max,temperature_2m_min',
    hourly: 'shortwave_radiation',
    timezone,
    forecast_days: forecastDays,
    past_days: '1',
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

export async function fetchForecast(url: string): Promise<any> {
  const resp = await fetch(url, { cache: 'no-store' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
  return resp.json()
}
