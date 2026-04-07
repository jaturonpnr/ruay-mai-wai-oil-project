import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

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

// ─── Price Comparison Table ───────────────────────────────────────────────────

function PriceComparisonTable({ prices, selectedFuelType }) {
  const filtered = prices?.filter(p => !selectedFuelType || p.fuelType === selectedFuelType) ?? []

  if (!filtered.length) return (
    <div className="text-center text-gray-400 text-sm py-4">
      {selectedFuelType ? 'ไม่มีข้อมูลราคาสำหรับประเภทน้ำมันที่เลือก' : 'เลือกประเภทน้ำมันเพื่อดูตารางเปรียบเทียบ'}
    </div>
  )

  const stationColors = {
    PTT: 'bg-red-50 text-red-700',
    Bangchak: 'bg-green-50 text-green-700',
    Shell: 'bg-yellow-50 text-yellow-700',
  }

  return (
    <div>
      <h3 className="text-gray-700 font-bold mb-3 text-sm tracking-wide uppercase">เปรียบเทียบราคา</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="p-3 text-left font-semibold">สถานี</th>
              <th className="p-3 text-right font-semibold">วันนี้ (฿)</th>
              <th className="p-3 text-right font-semibold">พรุ่งนี้ (฿)</th>
              <th className="p-3 text-right font-semibold">ผลต่าง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => (
              <tr key={`${p.stationBrand}-${p.fuelType}`} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="p-3">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${stationColors[p.stationBrand] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.stationBrand}
                  </span>
                </td>
                <td className="p-3 text-right font-semibold text-gray-800">{Number(p.currentPrice).toFixed(2)}</td>
                <td className="p-3 text-right font-semibold text-gray-600">
                  {p.tomorrowPrice != null ? Number(p.tomorrowPrice).toFixed(2) : <span className="text-gray-400">-</span>}
                </td>
                <td className={`p-3 text-right font-black ${p.tomorrowPriceDifference > 0 ? 'text-red-500' : p.tomorrowPriceDifference < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                  {p.tomorrowPriceDifference != null
                    ? `${p.tomorrowPriceDifference > 0 ? '+' : ''}${Number(p.tomorrowPriceDifference).toFixed(2)}`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  // ── Derived ──
  const availableModels    = selectedBrand ? (carsData?.models?.[selectedBrand] ?? []) : []
  const availableFuelTypes = selectedModel ? (availableModels.find(m => m.model === selectedModel)?.fuelTypes ?? []) : []

  const handleBrandChange = (brand) => {
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

        {/* Golden Hour Banner */}
        <GoldenHourBanner alert={fuelPricesData?.goldenHourAlert} />

        {/* Fetch error */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            ⚠️ {fetchError}
          </div>
        )}

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

          {/* Brand Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">ยี่ห้อรถ</label>
            <select
              value={selectedBrand}
              onChange={e => handleBrandChange(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            >
              <option value="">— เลือกยี่ห้อรถ —</option>
              {carsData?.brands?.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Model Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">รุ่นรถ</label>
            <select
              value={selectedModel}
              onChange={e => handleModelChange(e.target.value)}
              disabled={!selectedBrand}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">— เลือกรุ่นรถ —</option>
              {availableModels.map(m => (
                <option key={m.model} value={m.model}>
                  {m.model} (ถัง {m.tankCapacity} ลิตร)
                </option>
              ))}
            </select>
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
            <select
              value={selectedFuelType}
              onChange={e => { setSelectedFuelType(e.target.value); setResult(null) }}
              disabled={!selectedModel}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">— เลือกประเภทน้ำมัน —</option>
              {availableFuelTypes.map(ft => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>
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

        {/* ── Price Comparison Card ── */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <PriceComparisonTable
            prices={fuelPricesData?.prices}
            selectedFuelType={selectedFuelType}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ราคาน้ำมันอ้างอิง ณ วันที่ {fuelPricesData?.priceDate ?? new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          {fuelPricesData?.isLive && <span className="ml-1.5 inline-block bg-green-100 text-green-600 text-xs font-bold px-1.5 py-0.5 rounded-full">● Live</span>}
        </p>

      </div>
    </div>
  )
}
