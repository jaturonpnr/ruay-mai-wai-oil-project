import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { fetchCars, fetchFuelPrices, calculate } from './api/fuelCalcApi'
import { PRIORITY_BRANDS, FUEL_TYPES } from './constants'
import GoldenHourBanner from './components/GoldenHourBanner'
import SearchableSelect from './components/SearchableSelect'
import BrandCardGrid from './components/BrandCardGrid'
import ResultSection from './components/ResultSection'
import TimeMachineCard from './components/TimeMachineCard'
import PriceComparisonTable from './components/PriceComparisonTable'
import SongkranTripCard from './components/SongkranTripCard'

export default function App() {
  // Remote data
  const [carsData, setCarsData]             = useState(null)
  const [fuelPricesData, setFuelPricesData] = useState(null)
  const [loading, setLoading]               = useState(true)
  const [fetchError, setFetchError]         = useState(null)

  // Form
  const [selectedBrand, setSelectedBrand]           = useState('')
  const [selectedModel, setSelectedModel]           = useState('')
  const [selectedFuelType, setSelectedFuelType]     = useState('')
  const [customTankCapacity, setCustomTankCapacity] = useState('')
  const [mode, setMode]                             = useState('fullTank')
  const [budgetAmount, setBudgetAmount]             = useState('')
  const [showBrandSearch, setShowBrandSearch]       = useState(false)

  // Result
  const [result, setResult]         = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError]   = useState(null)

  // Tab
  const [activeTab, setActiveTab] = useState('fuel') // 'fuel' | 'trip'

  // ── Initial data fetch ──
  useEffect(() => {
    const load = async () => {
      try {
        const [cars, prices] = await Promise.all([fetchCars(), fetchFuelPrices()])
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

  const selectedCarKmPerL = (() => {
    if (!selectedBrand || !selectedModel) return 0
    const models = carsData?.models?.[selectedBrand] ?? []
    return models.find(m => m.model === selectedModel)?.kmPerLiter ?? 0
  })()

  // ── Handlers ──
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
      const data = await calculate({ brand: selectedBrand, model: selectedModel, fuelType: selectedFuelType, mode, amount: budgetAmount })
      setResult(data)
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
          {result && (
            <ResultSection
              key={result.fuelType + result.mode + result.car?.modelFamily}
              result={result}
              tankCapacity={Number(customTankCapacity) || result.car?.tankCapacity}
            />
          )}
        </div>

        {/* ── Time Machine Card ── */}
        <TimeMachineCard
          result={result}
          brand={selectedBrand}
          model={selectedModel}
          fuelType={selectedFuelType}
          customTankCapacity={customTankCapacity}
        />

        {/* ── Price Comparison Card ── */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <PriceComparisonTable prices={fuelPricesData?.prices} />
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
