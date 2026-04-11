import { API_URL } from '../constants'

export async function fetchCars() {
  const res = await fetch(`${API_URL}/api/cars`)
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  return res.json()
}

export async function fetchFuelPrices() {
  const res = await fetch(`${API_URL}/api/fuel-prices`)
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  return res.json()
}

export async function calculate({ brand, model, fuelType, mode, amount }) {
  const params = new URLSearchParams({ brand, model, fuelType, mode })
  if (mode === 'budget') params.set('amount', amount)
  const res = await fetch(`${API_URL}/api/calculate?${params}`)
  if (!res.ok) throw new Error('คำนวณไม่สำเร็จ')
  return res.json()
}

export async function calculateTrip({ distanceKm, kmPerLiter, fuelPrice, isRoundTrip }) {
  const params = new URLSearchParams({
    distanceKm,
    kmPerLiter,
    fuelPrice: String(fuelPrice),
    isRoundTrip: String(isRoundTrip),
  })
  const res = await fetch(`${API_URL}/api/calculate-trip?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'คำนวณไม่สำเร็จ')
  }
  return res.json()
}

export async function compareHistory({ brand, model, fuelType, historicalDate, tankCapacity }) {
  const params = new URLSearchParams({
    brand,
    model,
    fuelType,
    historicalDate,
    tankCapacity: tankCapacity || '0',
  })
  const res = await fetch(`${API_URL}/api/compare-history?${params}`)
  if (res.status === 404) {
    throw new Error('ไม่พบข้อมูลราคาน้ำมันสำหรับประเภทและวันที่เลือก (อาจเป็นวันหยุดหรือ PTT ไม่มีข้อมูล)')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
  }
  return res.json()
}
