import { useState } from 'react'
import { QUICK_PRESETS } from '../constants'

export default function PriceSimulator({ result }) {
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
