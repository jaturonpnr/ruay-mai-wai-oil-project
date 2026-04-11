import { useState, useEffect, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'

const API_URL = import.meta.env.VITE_API_URL || ''

const PRIORITY_BRANDS = ['Toyota', 'Honda', 'Mazda', 'Isuzu']

const FUEL_TYPES = [
  'Gasohol91',
  'Gasohol95',
  'E20',
  'E85',
  'Diesel',
  'Diesel B10',
  'Hi Premium 97',
  'NGV',
]

const MILESTONES = [
  { label: "🚨 ก่อนคืนลักหลับขึ้น 6 บาท (25 มี.ค. 2026)", date: "2026-03-25" },
  { label: "💸 วัน 'พอแล้วๆๆ รวยไม่ไหวแล้ว!' (12 ก.พ. 2026)",  date: "2026-02-12" },
  { label: "📅 ต้นปีนี้ (1 ม.ค. 2026)",                       date: "2026-01-01" },
]

// ─── Golden Hour Banner ───────────────────────────────────────────────────────

function GoldenHourBanner({ alert }) {
  if (!alert?.isActive) return null
  return (
    <div className="bg-amber-400 text-amber-950 font-bold text-center py-3 px-4 rounded-2xl shadow-lg mb-5">
      <span className="text-2xl mr-2">⚠️</span>
      <span className="text-base leading-snug">{alert.message}</span>
    </div>
  )
}

// ─── Searchable Select ────────────────────────────────────────────────────────

function SearchableSelect({ options, value, onChange, placeholder, disabled, dark = false }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef(null)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const selected = options.find(o => o.value === value)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full border rounded-2xl px-4 py-3 text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 ${
          disabled
            ? dark ? 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed'
                   : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : dark ? 'bg-slate-800 text-slate-200 border-slate-600'
                   : 'bg-white text-gray-800 border-gray-200'
        } ${open ? (dark ? 'ring-2 ring-orange-400 border-transparent' : 'ring-2 ring-blue-400 border-transparent') : ''}`}
      >
        <span className={selected
          ? (dark ? 'text-slate-200' : 'text-gray-800')
          : (dark ? 'text-slate-500' : 'text-gray-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`text-xs transition-transform duration-200 ${dark ? 'text-slate-400' : 'text-gray-400'} ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && !disabled && (
        <div className={`absolute z-20 w-full mt-1 border rounded-2xl shadow-xl overflow-hidden ${
          dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-2 border-b ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหา..."
              className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 ${
                dark ? 'bg-slate-700 text-white border-slate-600 placeholder:text-slate-400 focus:ring-orange-400'
                     : 'border-gray-200 focus:ring-blue-400'
              }`}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className={`px-4 py-3 text-sm text-center ${dark ? 'text-slate-500' : 'text-gray-400'}`}>ไม่พบข้อมูล</div>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    o.value === value
                      ? (dark ? 'bg-slate-700 text-orange-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold')
                      : (dark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-blue-50')
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Visual Fuel Tank ─────────────────────────────────────────────────────────
// currentLevel = existing fuel (amber zone, bottom)
// fillAmount   = fuel being added (green zone, above current)
// When currentLevel is not provided, single-zone display (legacy).

function FuelTank({ currentLevel = 0, fillAmount = 0 }) {
  const current = Math.min(100, Math.max(0, currentLevel))
  const fill    = Math.min(100 - current, Math.max(0, fillAmount))
  const total   = current + fill

  return (
    <div className="flex flex-col items-center my-4">
      {/* Tank body */}
      <div className="relative w-28 h-44 border-4 border-gray-500 rounded-b-3xl rounded-t-xl bg-gray-100 overflow-hidden shadow-inner">

        {/* Existing fuel (amber) — bottom zone */}
        {current > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-amber-400 transition-all duration-700 ease-out"
            style={{ height: `${current}%` }}
          />
        )}

        {/* Fuel being added (green) — above the current level */}
        {fill > 0 && (
          <div
            className="absolute left-0 right-0 bg-green-500 transition-all duration-700 ease-out"
            style={{ bottom: `${current}%`, height: `${fill}%` }}
          />
        )}

        {/* Shimmer on top of the topmost fill */}
        {total > 0 && (
          <div
            className="absolute left-0 right-0 h-2 opacity-30 bg-white rounded-full transition-all duration-700"
            style={{ bottom: `calc(${total}% - 4px)` }}
          />
        )}

        {/* Labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {fill > 0 && current > 0 ? (
            <>
              <span className="font-black text-base text-white drop-shadow" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                +{Math.round(fill)}%
              </span>
              <div className="w-8 h-px bg-white opacity-50" />
              <span className="font-bold text-xs text-white opacity-80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                มีอยู่ {Math.round(current)}%
              </span>
            </>
          ) : (
            <span className="font-black text-2xl text-white drop-shadow" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
              {Math.round(total)}%
            </span>
          )}
        </div>
      </div>

      {/* Nozzle cap */}
      <div className="w-10 h-3 bg-gray-500 rounded-t-sm -mt-0.5" />

      {/* Legend */}
      {fill > 0 && current > 0 && (
        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />น้ำมันเดิม</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />เติมเพิ่ม</span>
        </div>
      )}
    </div>
  )
}

// ─── Time Machine Card ────────────────────────────────────────────────────────

function TimeMachineCard({
  result,
  selectedMilestone,
  setSelectedMilestone,
  timeMachineResult,
  timeMachineLoading,
  timeMachineError,
}) {
  const milestoneOptions = MILESTONES.map(m => ({ value: m.date, label: m.label }))
  const isUp = timeMachineResult && timeMachineResult.diffPerLiter > 0

  return (
    <div className="bg-slate-900 rounded-3xl shadow-lg p-6 space-y-4">

      {/* Header */}
      <div>
        <h2 className="text-orange-400 font-black text-xl tracking-tight">🕰️ เปรียบเทียบให้เจ็บปวด...</h2>
        <p className="text-slate-400 text-sm mt-0.5">ย้อนเวลาดูว่าเติมถังแพงขึ้นแค่ไหน</p>
      </div>

      {/* Milestone selector */}
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">เลือกช่วงเวลา</label>
        <SearchableSelect
          options={milestoneOptions}
          value={selectedMilestone}
          onChange={setSelectedMilestone}
          placeholder="— เลือกช่วงเวลา —"
          disabled={!result}
          dark
        />
        {!result && (
          <p className="text-slate-500 text-xs mt-1.5">กรุณาคำนวณค่าน้ำมันก่อน เพื่อเปิดใช้งาน</p>
        )}
      </div>

      {/* Body states */}
      {!result && (
        <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center">
          <p className="text-slate-500 text-sm">⛽ คำนวณค่าน้ำมันก่อน แล้วย้อนเวลากลับไปดูว่าแพงขึ้นเท่าไหร่</p>
        </div>
      )}

      {result && !selectedMilestone && !timeMachineLoading && !timeMachineResult && (
        <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center">
          <p className="text-slate-500 text-sm">เลือกช่วงเวลาด้านบนเพื่อดูผลลัพธ์</p>
        </div>
      )}

      {timeMachineLoading && (
        <div className="flex items-center justify-center gap-3 py-6">
          <svg className="animate-spin h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className="text-slate-400 text-sm">กำลังดึงข้อมูลย้อนหลัง...</span>
        </div>
      )}

      {!timeMachineLoading && timeMachineError && (
        <div className="bg-red-950 border border-red-800 rounded-2xl p-4 text-center">
          <p className="text-red-400 text-sm">{timeMachineError}</p>
        </div>
      )}

      {!timeMachineLoading && timeMachineResult && (
        <div className="space-y-3">
          {/* Price comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-2xl p-3.5 text-center">
              <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wide">ราคาวันนั้น</p>
              <p className="font-black text-slate-200 text-lg tabular-nums">
                ฿{Number(timeMachineResult.historicalPricePerLiter).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5"> บาท/ลิตร </p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-3.5 text-center">
              <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wide">ราคาวันนี้</p>
              <p className={`font-black text-lg tabular-nums ${isUp ? 'text-red-400' : 'text-green-400'}`}>
                ฿{Number(timeMachineResult.currentPricePerLiter).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">บาท/ลิตร</p>
            </div>
          </div>

          {/* Hero result */}
          <div className={`rounded-2xl p-5 text-center border ${
            isUp ? 'bg-red-950 border-red-800' : 'bg-green-950 border-green-800'
          }`}>
            <p className={`text-sm font-bold mb-1 ${isUp ? 'text-red-400' : 'text-green-400'}`}>
              {isUp ? 'เทียบกับวันนั้น... วันนี้เติมเต็มถัง' : 'เทียบกับวันนั้น... วันนี้เติมเต็มถัง'}
            </p>
            <p className={`font-black text-5xl tabular-nums mt-1 ${isUp ? 'text-red-400' : 'text-green-400'}`}>
              {isUp ? '+' : '-'}฿{Math.abs(timeMachineResult.extraCostForFullTank).toFixed(2)}
            </p>
            <p className={`text-base font-black mt-1 ${isUp ? 'text-red-300' : 'text-green-300'}`}>
              {isUp ? 'แพงขึ้น !!' : 'ถูกลง !!'}
            </p>
            <p className="text-slate-500 text-xs mt-3">
              ถัง {timeMachineResult.tankCapacity}L &nbsp;·&nbsp;
              {isUp ? '+' : ''}{Number(timeMachineResult.diffPerLiter).toFixed(2)} บาท/ลิตร
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Price Comparison Table ───────────────────────────────────────────────────

const DISPLAY_STATIONS = ['PTT', 'Bangchak']

const FUEL_TYPE_LABELS = {
  Gasohol95:     'Gasohol 95',
  Gasohol91:     'Gasohol 91',
  E20:           'E20',
  E85:           'E85',
  Diesel:        'Diesel B7',
  'Diesel B10':  'Diesel B10',
}

function PriceComparisonTable({ prices }) {
  if (!prices?.length) return (
    <div className="text-center text-gray-400 text-sm py-4">กำลังโหลดราคาน้ำมัน...</div>
  )

  // เอาเฉพาะ PTT กับ Bangchak, จัดกลุ่มตาม fuelType → station → price
  const fuelTypes = [...new Set(
    prices.filter(p => DISPLAY_STATIONS.includes(p.stationBrand)).map(p => p.fuelType)
  )]

  const priceMap = {}
  for (const p of prices) {
    if (!DISPLAY_STATIONS.includes(p.stationBrand)) continue
    if (!priceMap[p.fuelType]) priceMap[p.fuelType] = {}
    priceMap[p.fuelType][p.stationBrand] = p
  }

  // หา tomorrowPriceDifference จาก PTT (เป็น source หลัก)
  const getTomorrow = (fuelType) => {
    const ptt = priceMap[fuelType]?.PTT
    if (!ptt) return null
    return ptt.tomorrowPriceDifference
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-700 font-bold text-sm tracking-wide">⛽ ราคาน้ำมันวันนี้</h3>
        <span className="text-xs text-gray-400">บาท/ลิตร</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="p-3 text-left font-semibold">ประเภท</th>
              <th className="p-3 text-center font-semibold">
                <span className="inline-block bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">PTT</span>
              </th>
              <th className="p-3 text-center font-semibold">
                <span className="inline-block bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full">Bangchak</span>
              </th>
              <th className="p-3 text-center font-semibold">พรุ่งนี้</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fuelTypes.map(ft => {
              const diff = getTomorrow(ft)
              return (
                <tr key={ft} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold text-gray-700">{FUEL_TYPE_LABELS[ft] ?? ft}</td>
                  {DISPLAY_STATIONS.map(station => (
                    <td key={station} className="p-3 text-center font-semibold text-gray-800">
                      {priceMap[ft]?.[station]
                        ? Number(priceMap[ft][station].currentPrice).toFixed(2)
                        : <span className="text-gray-300">-</span>}
                    </td>
                  ))}
                  <td className={`p-3 text-center font-black text-sm ${
                    diff == null ? 'text-gray-300'
                    : diff > 0 ? 'text-red-500'
                    : diff < 0 ? 'text-green-500'
                    : 'text-gray-400'
                  }`}>
                    {diff == null ? '-' : `${diff > 0 ? '+' : ''}${Number(diff).toFixed(2)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Brand Card Grid ──────────────────────────────────────────────────────────

const BRAND_CARD_CONFIG = [
  { brand: 'Toyota', logo: '/logo/toyota_logo_transparent.png' },
  { brand: 'Honda',  logo: '/logo/honda_logo_transparent.png'  },
  { brand: 'Mazda',  logo: '/logo/mazda_logo_transparent.png'  },
  { brand: 'Isuzu',  logo: '/logo/isuzu_logo_transparent.png'  },
  { brand: 'อื่นๆ', logo: null                                 },
]

function BrandCardGrid({ selectedBrand, onSelect }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {BRAND_CARD_CONFIG.map(({ brand, logo }) => {
        const isSelected = brand === 'อื่นๆ'
          ? (selectedBrand && !PRIORITY_BRANDS.includes(selectedBrand))
          : selectedBrand === brand
        return (
          <button
            key={brand}
            type="button"
            onClick={() => onSelect(brand)}
            className={`aspect-square flex items-center justify-center rounded-2xl border-2 transition-all duration-150 p-3 ${
              isSelected
                ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            {logo ? (
              <img src={logo} alt={brand} className="w-full h-full object-contain" />
            ) : (
              <span className="text-sm text-gray-500 font-black">อื่นๆ</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Songkran Trip Card ───────────────────────────────────────────────────────

const PRESET_ROUTES = [
  { label: 'กรุงเทพ → เชียงใหม่',      distance: 700  },
  { label: 'กรุงเทพ → ขอนแก่น',        distance: 445  },
  { label: 'กรุงเทพ → อุดรธานี',       distance: 561  },
  { label: 'กรุงเทพ → โคราช',          distance: 260  },
  { label: 'กรุงเทพ → หาดใหญ่',        distance: 950  },
  { label: 'กรุงเทพ → สุราษฎร์ธานี',  distance: 645  },
  { label: 'กรุงเทพ → พัทยา',          distance: 140  },
  { label: 'กรุงเทพ → หัวหิน',         distance: 200  },
  { label: 'กรุงเทพ → กาญจนบุรี',      distance: 130  },
]

function SongkranTripCard({
  fuelPricesData,
  selectedCarKmPerL,
  tripDistance, setTripDistance,
  tripKmPerLiter, setTripKmPerLiter,
  tripFuelType, setTripFuelType,
  tripRoundTrip, setTripRoundTrip,
  tripResult, setTripResult,
  tripCalculating, setTripCalculating,
  tripError, setTripError,
}) {
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
      const params = new URLSearchParams({
        distanceKm:  tripDistance,
        kmPerLiter:  tripKmPerLiter,
        fuelPrice:   String(fuelPrice),
        isRoundTrip: String(tripRoundTrip),
      })
      const res = await fetch(`${API_URL}/api/calculate-trip?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'คำนวณไม่สำเร็จ')
      }
      setTripResult(await res.json())
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
              onClick={() => setTripDistance(String(r.distance))}
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

// ─── Price Simulator (What-If) ────────────────────────────────────────────────

const QUICK_PRESETS = [0.5, 1.0, 2.0, 3.0,3.5]

function PriceSimulator({ result }) {
  const [adjustment, setAdjustment] = useState(0.5)

  const adj              = Number(adjustment)
  const simPricePerLiter = Number(result.pricePerLiter) + adj
  const simCost          = Math.round(result.liters * simPricePerLiter * 100) / 100
  const extraCost        = Math.round(result.liters * adj * 100) / 100
  const isUp             = adj > 0
  const isDown           = adj < 0

  return (
    <div className="border-t border-dashed border-gray-200 pt-5 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🔮</span>
        <div>
          <h3 className="font-black text-gray-700 leading-none">จำลองราคาแบบรวยไม่ไหว</h3>
          <p className="text-xs text-gray-400 mt-0.5">ถ้าราคาพรุ่งนี้ปรับ... ต้องจ่ายเพิ่มเท่าไหร่?</p>
        </div>
      </div>

      {/* Quick preset buttons */}
      <div>
        <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">ปรับราคาด่วน (บาท/ลิตร)</p>
        <div className="flex gap-2 flex-wrap">
          {QUICK_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setAdjustment(p)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-black border-2 transition-all ${
                adj === p
                  ? 'bg-orange-500 text-white border-orange-500 scale-105 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              +{p.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">หรือปรับด้วย Slider</p>
          <span className={`font-black text-xl tabular-nums ${isUp ? 'text-orange-500' : isDown ? 'text-green-500' : 'text-gray-400'}`}>
            {adj >= 0 ? '+' : ''}{adj.toFixed(2)} ฿/ล.
          </span>
        </div>
        <input
          type="range"
          min="-5"
          max="10"
          step="0.25"
          value={adj}
          onChange={e => setAdjustment(Number(e.target.value))}
          className="w-full cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between text-xs text-gray-300 mt-1 select-none">
          <span>-5.00</span><span>0</span><span>+10.00</span>
        </div>
      </div>

      {/* Comparison card */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-2xl p-3.5 text-center">
          <p className="text-xs text-blue-500 font-bold mb-1 uppercase tracking-wide">ราคาปัจจุบัน</p>
          <p className="font-black text-blue-700 text-base">฿{Number(result.pricePerLiter).toFixed(2)}/ลิตร</p>
          <p className="font-black text-blue-800 text-xl mt-1">฿{Number(result.cost).toFixed(2)}</p>
        </div>
        <div className={`rounded-2xl p-3.5 text-center transition-colors ${
          isUp ? 'bg-orange-50' : isDown ? 'bg-green-50' : 'bg-gray-50'
        }`}>
          <p className={`text-xs font-bold mb-1 uppercase tracking-wide ${isUp ? 'text-orange-500' : isDown ? 'text-green-500' : 'text-gray-400'}`}>
            ราคาที่คาดการณ์
          </p>
          <p className={`font-black text-base ${isUp ? 'text-orange-700' : isDown ? 'text-green-700' : 'text-gray-600'}`}>
            ฿{simPricePerLiter.toFixed(2)}/ลิตร
          </p>
          <p className={`font-black text-xl mt-1 ${isUp ? 'text-orange-800' : isDown ? 'text-green-800' : 'text-gray-700'}`}>
            ฿{simCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Extra cost / savings result */}
      {adj !== 0 && (
        <div className={`rounded-2xl p-4 text-center border ${
          isUp ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <p className={`text-sm font-bold ${isUp ? 'text-red-600' : 'text-green-600'}`}>
            {isUp ? '⚠️ ต้องจ่ายเพิ่ม' : '✅ ประหยัดได้'}
          </p>
          <p className={`font-black text-4xl mt-1 tabular-nums ${isUp ? 'text-red-600' : 'text-green-600'}`}>
            {isUp ? '+' : '-'}฿{Math.abs(extraCost).toFixed(2)}
          </p>
          <p className={`text-xs mt-2 ${isUp ? 'text-red-400' : 'text-green-400'}`}>
            {result.liters.toFixed(2)} ลิตร × ({adj >= 0 ? '+' : ''}{adj.toFixed(2)} บาท/ลิตร)
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Result Section ───────────────────────────────────────────────────────────
// Mental model: user tells us current gauge level → system calculates what to add.
// currentLevel = existing fuel (0–95%)
// litersToAdd  = (100 - currentLevel) / 100 × tankCapacity

const GAUGE_PRESETS = [
  { label: 'E',  value: 0  },
  { label: '¼',  value: 25 },
  { label: '½',  value: 50 },
  { label: '¾',  value: 75 },
]

function ResultSection({ result, tankCapacity }) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const fillAmount      = 100 - currentLevel                                          // % of tank to add
  const litersToAdd     = Math.round((fillAmount / 100) * tankCapacity * 100) / 100
  const costToAdd       = Math.round(litersToAdd * result.pricePerLiter * 100) / 100
  const savingsPerLiter = result.liters > 0 ? result.savings / result.liters : 0
  const displaySavings  = Math.round(litersToAdd * savingsPerLiter * 100) / 100

  const adjustedResult  = { ...result, liters: litersToAdd, cost: costToAdd }

  return (
    <div className="border-t border-gray-100 pt-5 space-y-4">

      {/* ── Two-zone Tank Visual ── */}
      <div>
        <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase text-center mb-1">
          ระดับน้ำมันหลังเติม
        </p>
        <FuelTank currentLevel={currentLevel} fillAmount={fillAmount} />
      </div>

      {/* ── Current Level Input ── */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-bold text-gray-600">⛽ ระดับน้ำมันปัจจุบัน</p>
          <span className="font-black text-amber-600 text-lg tabular-nums">{currentLevel}%</span>
        </div>

        {/* Gauge quick-select buttons */}
        <div className="flex gap-2">
          {GAUGE_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setCurrentLevel(value)}
              className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${
                currentLevel === value
                  ? 'bg-amber-400 text-white border-amber-400 scale-105 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={currentLevel}
            onChange={e => setCurrentLevel(Number(e.target.value))}
            className="w-full cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-0.5 select-none">
            <span>E (ว่าง)</span><span>½</span><span>95%</span>
          </div>
        </div>
      </div>

      {/* ── Cost Summary ── */}
      <div className="bg-blue-50 rounded-2xl p-4 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">ต้องเติมเพิ่ม ({fillAmount}% ของ {tankCapacity}L)</span>
          <span className="font-bold text-gray-800">{litersToAdd.toFixed(2)} ลิตร</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">ราคา/ลิตร ({result.cheapestStation})</span>
          <span className="font-bold text-gray-800">฿{Number(result.pricePerLiter).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-blue-100 pt-2.5">
          <span className="text-gray-700 font-bold">ค่าน้ำมันที่ต้องจ่าย</span>
          <span className="font-black text-blue-700 text-2xl tabular-nums">฿{costToAdd.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Savings Badge ── */}
      {displaySavings > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-green-700 font-semibold text-sm mb-1">
            ประหยัดได้ ฿{displaySavings.toFixed(2)} ถ้าเติมวันนี้แทนพรุ่งนี้
          </p>
          <p className="font-black text-3xl text-green-600">
            ประหยัด ฿{displaySavings.toFixed(2)}
          </p>
        </div>
      )}

      {/* ── What-If Simulator ── */}
      <PriceSimulator result={adjustedResult} />
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Remote data
  const [carsData, setCarsData]           = useState(null)
  const [fuelPricesData, setFuelPricesData] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState(null)

  // Form
  const [selectedBrand, setSelectedBrand]         = useState('')
  const [selectedModel, setSelectedModel]         = useState('')
  const [selectedFuelType, setSelectedFuelType]   = useState('')
  const [customTankCapacity, setCustomTankCapacity] = useState('')
  const [mode, setMode]                           = useState('fullTank')
  const [budgetAmount, setBudgetAmount]           = useState('')

  // Result
  const [result, setResult]         = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError]   = useState(null)

  // Time Machine
  const [selectedMilestone, setSelectedMilestone]   = useState('')
  const [timeMachineResult, setTimeMachineResult]   = useState(null)
  const [timeMachineLoading, setTimeMachineLoading] = useState(false)
  const [timeMachineError, setTimeMachineError]     = useState(null)

  // Tab & Brand cards
  const [activeTab, setActiveTab]             = useState('fuel') // 'fuel' | 'trip'
  const [showBrandSearch, setShowBrandSearch] = useState(false)

  // Songkran Trip
  const [tripDistance, setTripDistance]       = useState('')
  const [tripKmPerLiter, setTripKmPerLiter]   = useState('')
  const [tripFuelType, setTripFuelType]       = useState('')
  const [tripRoundTrip, setTripRoundTrip]     = useState(true)
  const [tripResult, setTripResult]           = useState(null)
  const [tripCalculating, setTripCalculating] = useState(false)
  const [tripError, setTripError]             = useState(null)

  // ── Initial data fetch ──
  useEffect(() => {
    const load = async () => {
      try {
        const [carsRes, pricesRes] = await Promise.all([
          fetch(`${API_URL}/api/cars`),
          fetch(`${API_URL}/api/fuel-prices`),
        ])
        if (!carsRes.ok || !pricesRes.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        const [cars, prices] = await Promise.all([carsRes.json(), pricesRes.json()])
        setCarsData(cars)
        setFuelPricesData(prices)
      } catch (err) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Time Machine auto-fetch ──
  useEffect(() => {
    if (!selectedMilestone || !result) {
      setTimeMachineResult(null)
      setTimeMachineError(null)
      return
    }
    const milestone = selectedMilestone // snapshot for race condition guard
    const run = async () => {
      setTimeMachineLoading(true)
      setTimeMachineError(null)
      setTimeMachineResult(null)
      try {
        const params = new URLSearchParams({
          brand: selectedBrand,
          model: selectedModel,
          fuelType: selectedFuelType,
          historicalDate: milestone,
          tankCapacity: customTankCapacity || '0',
        })
        const res = await fetch(`${API_URL}/api/compare-history?${params}`)
        if (milestone !== selectedMilestone) return // stale response
        if (res.status === 404) {
          setTimeMachineError('ไม่พบข้อมูลราคาน้ำมันสำหรับประเภทและวันที่เลือก (อาจเป็นวันหยุดหรือ PTT ไม่มีข้อมูล)')
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setTimeMachineError(body.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
          return
        }
        setTimeMachineResult(await res.json())
      } catch {
        setTimeMachineError('เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่')
      } finally {
        setTimeMachineLoading(false)
      }
    }
    run()
  }, [selectedMilestone, result]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──
  const availableModels = selectedBrand ? (carsData?.models?.[selectedBrand] ?? []) : []

  const brandOptions = (() => {
    const brands = carsData?.brands ?? []
    const priority = PRIORITY_BRANDS.filter(b => brands.includes(b))
    const rest = brands.filter(b => !PRIORITY_BRANDS.includes(b)).sort()
    return [...priority, ...rest].map(b => ({ value: b, label: b }))
  })()

  const modelOptions = availableModels.map(m => ({
    value: m.model,
    label: m.tankCapacity > 0 ? `${m.model} (${m.tankCapacity}L)` : m.model,
  }))

  const fuelTypeOptions = FUEL_TYPES.map(ft => ({ value: ft, label: ft }))

  // km/L from selected car (0 = unknown)
  const selectedCarKmPerL = (() => {
    if (!selectedBrand || !selectedModel) return 0
    const models = carsData?.models?.[selectedBrand] ?? []
    return models.find(m => m.model === selectedModel)?.kmPerLiter ?? 0
  })()

  // Sync km/L into trip card when car selection changes
  useEffect(() => {
    if (selectedCarKmPerL > 0) setTripKmPerLiter(String(selectedCarKmPerL))
  }, [selectedCarKmPerL]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBrandChange = (brand) => {
    if (brand === 'อื่นๆ') {
      setShowBrandSearch(true)
      return
    }
    setShowBrandSearch(false)
    setSelectedBrand(brand)
    setSelectedModel('')
    setSelectedFuelType('')
    setResult(null)
    setCalcError(null)
  }

  const handleModelChange = (model) => {
    setSelectedModel(model)
    setSelectedFuelType('')
    setResult(null)
    setCalcError(null)
    const found = availableModels.find(m => m.model === model)
    setCustomTankCapacity(found?.tankCapacity ? String(found.tankCapacity) : '')
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setResult(null)
    setCalcError(null)
  }

  // ── Calculate ──
  const canCalculate =
    selectedBrand && selectedModel && selectedFuelType &&
    (mode === 'fullTank' || (budgetAmount && Number(budgetAmount) > 0))

  const handleCalculate = async () => {
    if (!canCalculate) return
    setCalculating(true)
    setCalcError(null)
    setResult(null)
    try {
      const params = new URLSearchParams({
        brand: selectedBrand,
        model: selectedModel,
        fuelType: selectedFuelType,
        mode,
        ...(mode === 'budget' && { amount: budgetAmount }),
      })
      const res = await fetch(`${API_URL}/api/calculate?${params}`)
      if (!res.ok) throw new Error('คำนวณไม่สำเร็จ')
      setResult(await res.json())
    } catch (err) {
      setCalcError(err.message)
    } finally {
      setCalculating(false)
    }
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⛽</div>
          <p className="text-gray-500 text-lg animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Header */}
        <div className="text-center pb-2">
          <div className="text-5xl mb-2">⛽</div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">คำนวณค่าน้ำมันแบบรวยไม่ไหว</h1>
          <p className="text-gray-400 text-sm mt-1">เปรียบเทียบราคาและประหยัดค่าน้ำมัน</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-2xl overflow-hidden border border-gray-200 p-1 bg-gray-100 gap-1">
          {[
            { value: 'fuel', label: '⛽ เติมน้ำมัน' },
            { value: 'trip', label: '🚗 ทริปสงกรานต์ 💦' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex-1 py-3 px-3 rounded-xl text-sm font-black transition-all duration-200 ${
                activeTab === value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Golden Hour Banner */}
        <GoldenHourBanner alert={fuelPricesData?.goldenHourAlert} />

        {/* Fetch error */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            ⚠️ {fetchError}
          </div>
        )}

        {activeTab === 'trip' && (
          <SongkranTripCard
            fuelPricesData={fuelPricesData}
            selectedCarKmPerL={selectedCarKmPerL}
            tripDistance={tripDistance} setTripDistance={setTripDistance}
            tripKmPerLiter={tripKmPerLiter} setTripKmPerLiter={setTripKmPerLiter}
            tripFuelType={tripFuelType} setTripFuelType={setTripFuelType}
            tripRoundTrip={tripRoundTrip} setTripRoundTrip={setTripRoundTrip}
            tripResult={tripResult} setTripResult={setTripResult}
            tripCalculating={tripCalculating} setTripCalculating={setTripCalculating}
            tripError={tripError} setTripError={setTripError}
          />
        )}

        {activeTab === 'fuel' && <>

        {/* ── Main Calculator Card ── */}
        <div className="bg-white rounded-3xl shadow-lg p-6 space-y-5">

          {/* Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">โหมดการเติม</label>
            <div className="flex rounded-2xl overflow-hidden border border-gray-200 p-1 bg-gray-50 gap-1">
              {[
                { value: 'fullTank', label: '🚗 เติมเต็มถัง' },
                { value: 'budget',   label: '💰 ระบุจำนวนเงิน' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleModeChange(value)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    mode === value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Cards */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">ยี่ห้อรถ</label>
            <BrandCardGrid selectedBrand={selectedBrand} onSelect={handleBrandChange} />
            {showBrandSearch && (
              <div className="mt-2">
                <SearchableSelect
                  options={brandOptions.filter(b => !PRIORITY_BRANDS.includes(b.value))}
                  value={selectedBrand}
                  onChange={(brand) => {
                    setSelectedBrand(brand)
                    setSelectedModel('')
                    setSelectedFuelType('')
                    setResult(null)
                    setCalcError(null)
                  }}
                  placeholder="— ค้นหายี่ห้อ —"
                />
              </div>
            )}
          </div>

          {/* Model Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">รุ่นรถ</label>
            <SearchableSelect
              options={modelOptions}
              value={selectedModel}
              onChange={handleModelChange}
              placeholder="— เลือกรุ่นรถ —"
              disabled={!selectedBrand}
            />
          </div>

          {/* Tank Capacity */}
          {selectedModel && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ขนาดถังน้ำมัน</label>
              <div className="relative">
                <input
                  type="number"
                  value={customTankCapacity}
                  onChange={e => { setCustomTankCapacity(e.target.value); setResult(null) }}
                  placeholder="ระบุขนาดถัง เช่น 42"
                  min="1"
                  max="200"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-14 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">ลิตร</span>
              </div>
              {!customTankCapacity && (
                <p className="text-xs text-amber-500 mt-1">⚠️ ไม่พบข้อมูลขนาดถังในระบบ กรุณาระบุเอง</p>
              )}
            </div>
          )}

          {/* Fuel Type Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ประเภทน้ำมัน</label>
            <SearchableSelect
              options={fuelTypeOptions}
              value={selectedFuelType}
              onChange={v => { setSelectedFuelType(v); setResult(null) }}
              placeholder="— เลือกประเภทน้ำมัน —"
              disabled={!selectedModel}
            />
          </div>

          {/* Budget Input */}
          {mode === 'budget' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">จำนวนเงิน</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">฿</span>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={e => { setBudgetAmount(e.target.value); setResult(null) }}
                  placeholder="ระบุจำนวนเงิน เช่น 500"
                  min="1"
                  className="w-full border border-gray-200 rounded-2xl pl-9 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={!canCalculate || calculating}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl transition-all duration-200 text-lg shadow-md disabled:shadow-none"
          >
            {calculating ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                กำลังคำนวณ...
              </span>
            ) : 'คำนวณ'}
          </button>

          {/* Calc error */}
          {calcError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm text-center">
              {calcError}
            </div>
          )}

          {/* ── Result Section ── */}
          {result && <ResultSection key={result.fuelType + result.mode + result.car?.modelFamily} result={result} tankCapacity={Number(customTankCapacity) || result.car?.tankCapacity} />}
        </div>

        {/* ── Time Machine Card ── */}
        <TimeMachineCard
          result={result}
          selectedMilestone={selectedMilestone}
          setSelectedMilestone={setSelectedMilestone}
          timeMachineResult={timeMachineResult}
          timeMachineLoading={timeMachineLoading}
          timeMachineError={timeMachineError}
        />

        {/* ── Price Comparison Card ── */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <PriceComparisonTable
            prices={fuelPricesData?.prices}
          />
        </div>

        </>}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ราคาน้ำมันอ้างอิง ณ วันที่ {fuelPricesData?.priceDate ?? new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          {fuelPricesData?.isLive && <span className="ml-1.5 inline-block bg-green-100 text-green-600 text-xs font-bold px-1.5 py-0.5 rounded-full">● Live</span>}
        </p>

      </div>
      <Analytics />
    </div>
  )
}
