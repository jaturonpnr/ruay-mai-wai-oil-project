import { useState, useEffect } from 'react'
import SearchableSelect from './SearchableSelect'
import { calculateTrip } from '../api/fuelCalcApi'
import { FUEL_TYPES, PRESET_ROUTES } from '../constants'

export default function SongkranTripCard({ fuelPricesData, selectedCarKmPerL }) {
  const [tripDistance, setTripDistance]     = useState('')
  const [tripKmPerLiter, setTripKmPerLiter] = useState('')
  const [tripFuelType, setTripFuelType]     = useState('')
  const [tripRoundTrip, setTripRoundTrip]   = useState(true)
  const [tripResult, setTripResult]         = useState(null)
  const [tripCalculating, setTripCalculating] = useState(false)
  const [tripError, setTripError]           = useState(null)

  // Sync km/L from car selected in main calculator
  useEffect(() => {
    if (selectedCarKmPerL > 0) setTripKmPerLiter(String(selectedCarKmPerL))
  }, [selectedCarKmPerL])

  const fuelTypeOptions = FUEL_TYPES.map(ft => ({ value: ft, label: ft }))

  const fuelPrice = (() => {
    if (!tripFuelType || !fuelPricesData?.prices) return 0
    const entry = fuelPricesData.prices.find(
      p => p.stationBrand === 'PTT' && p.fuelType === tripFuelType
    )
    return entry ? Number(entry.currentPrice) : 0
  })()

  const canCalculate = Number(tripDistance) > 0 && Number(tripKmPerLiter) > 0 && fuelPrice > 0

  const handleCalculate = async () => {
    if (!canCalculate) return
    setTripCalculating(true)
    setTripError(null)
    setTripResult(null)
    try {
      const data = await calculateTrip({
        distanceKm:  tripDistance,
        kmPerLiter:  tripKmPerLiter,
        fuelPrice,
        isRoundTrip: tripRoundTrip,
      })
      setTripResult(data)
    } catch (err) {
      setTripError(err.message)
    } finally {
      setTripCalculating(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-cyan-900 to-blue-900 rounded-3xl shadow-lg p-6 space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-cyan-300 font-black text-xl tracking-tight">🚗 ทริปสงกรานต์ 💦</h2>
        <p className="text-cyan-500 text-sm mt-0.5">คำนวณค่าน้ำมันสำหรับการเดินทางช่วงสงกรานต์</p>
      </div>

      {/* Preset routes */}
      <div>
        <label className="block text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wide">เส้นทางยอดนิยม</label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {PRESET_ROUTES.map(r => (
            <button
              key={r.label}
              type="button"
              onClick={() => { setTripDistance(String(r.distance)); setTripResult(null) }}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                String(r.distance) === tripDistance
                  ? 'bg-cyan-400 text-cyan-900 border-cyan-400'
                  : 'border-cyan-700 text-cyan-300 hover:border-cyan-400 hover:text-cyan-100'
              }`}
            >
              {r.label}
              <span className="block text-center opacity-70">{r.distance} กม.</span>
            </button>
          ))}
        </div>
      </div>

      {/* Distance + Round-trip */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">ระยะทาง (กม.)</label>
          <div className="relative">
            <input
              type="number"
              value={tripDistance}
              onChange={e => { setTripDistance(e.target.value); setTripResult(null) }}
              placeholder="เช่น 700"
              min="1"
              className="w-full bg-cyan-950 border border-cyan-700 text-cyan-100 placeholder-cyan-700 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-600 text-xs font-semibold">กม.</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">ประเภทเที่ยว</label>
          <button
            type="button"
            onClick={() => { setTripRoundTrip(v => !v); setTripResult(null) }}
            className={`w-full py-3 px-4 rounded-2xl font-black text-sm border-2 transition-all ${
              tripRoundTrip
                ? 'bg-cyan-400 text-cyan-900 border-cyan-400'
                : 'bg-transparent text-cyan-400 border-cyan-700 hover:border-cyan-400'
            }`}
          >
            {tripRoundTrip ? '↩ ไป-กลับ' : '→ เที่ยวเดียว'}
          </button>
        </div>
      </div>

      {/* Fuel type + km/L */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">ประเภทน้ำมัน</label>
          <SearchableSelect
            options={fuelTypeOptions}
            value={tripFuelType}
            onChange={v => { setTripFuelType(v); setTripResult(null) }}
            placeholder="— เลือก —"
            dark
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">
            กม./ลิตร
            {selectedCarKmPerL > 0 && <span className="ml-1 text-cyan-600 font-normal text-xs">(จากรถที่เลือก)</span>}
          </label>
          <div className="relative">
            <input
              type="number"
              value={tripKmPerLiter}
              onChange={e => { setTripKmPerLiter(e.target.value); setTripResult(null) }}
              placeholder={selectedCarKmPerL > 0 ? String(selectedCarKmPerL) : 'เช่น 14'}
              min="1"
              className="w-full bg-cyan-950 border border-cyan-700 text-cyan-100 placeholder-cyan-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Fuel price indicator */}
      {tripFuelType && (
        <div className="bg-cyan-950 rounded-2xl p-3 flex justify-between items-center">
          <span className="text-cyan-400 text-sm">ราคา {tripFuelType} (PTT วันนี้)</span>
          <span className="font-black text-cyan-100">
            {fuelPrice > 0
              ? `฿${fuelPrice.toFixed(2)}/ลิตร`
              : <span className="text-cyan-600">ไม่พบราคา</span>}
          </span>
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={!canCalculate || tripCalculating}
        className="w-full bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:bg-cyan-950 disabled:text-cyan-700 text-cyan-900 font-black py-4 rounded-2xl transition-all text-lg shadow-md"
      >
        {tripCalculating ? 'กำลังคำนวณ...' : 'คำนวณค่าน้ำมันทริป'}
      </button>

      {/* Error */}
      {tripError && (
        <div className="bg-red-950 border border-red-800 rounded-2xl p-3 text-red-400 text-sm text-center">
          {tripError}
        </div>
      )}

      {/* Result */}
      {tripResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyan-950 rounded-2xl p-3.5 text-center">
              <p className="text-xs text-cyan-500 font-bold mb-1 uppercase tracking-wide">ระยะทางรวม</p>
              <p className="font-black text-cyan-100 text-xl tabular-nums">{tripResult.effectiveDistance} กม.</p>
              {tripResult.isRoundTrip && <p className="text-xs text-cyan-600 mt-0.5">(ไป-กลับ)</p>}
            </div>
            <div className="bg-cyan-950 rounded-2xl p-3.5 text-center">
              <p className="text-xs text-cyan-500 font-bold mb-1 uppercase tracking-wide">น้ำมันที่ต้องการ</p>
              <p className="font-black text-cyan-100 text-xl tabular-nums">{tripResult.litersNeeded} ลิตร</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-5 text-center">
            <p className="text-cyan-900 font-bold text-sm mb-1">เตรียมค่าน้ำมันไว้เลย</p>
            <p className="font-black text-white text-5xl tabular-nums tracking-tight">
              ฿{Number(tripResult.totalCost).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-cyan-100 text-xs mt-2 opacity-80">
              {tripResult.effectiveDistance} กม. ÷ {tripResult.kmPerLiter} กม./ล. × ฿{Number(tripResult.fuelPrice).toFixed(2)}/ล.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
