import { useState } from 'react'
import FuelTank from './FuelTank'
import PriceSimulator from './PriceSimulator'
import { GAUGE_PRESETS } from '../constants'

// Mental model: user tells us current gauge level → system calculates what to add.
// currentLevel = existing fuel (0–95%)
// litersToAdd  = (100 - currentLevel) / 100 × tankCapacity
export default function ResultSection({ result, tankCapacity }) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const fillAmount      = 100 - currentLevel
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
