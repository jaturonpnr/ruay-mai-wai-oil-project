import { useState, useEffect } from 'react'
import SearchableSelect from './SearchableSelect'
import { compareHistory } from '../api/fuelCalcApi'
import { MILESTONES } from '../constants'

export default function TimeMachineCard({ result, brand, model, fuelType, customTankCapacity }) {
  const [selectedMilestone, setSelectedMilestone] = useState('')
  const [timeMachineResult, setTimeMachineResult] = useState(null)
  const [timeMachineLoading, setTimeMachineLoading] = useState(false)
  const [timeMachineError, setTimeMachineError] = useState(null)

  useEffect(() => {
    if (!selectedMilestone || !result) {
      setTimeMachineResult(null)
      setTimeMachineError(null)
      return
    }
    const milestone = selectedMilestone
    const run = async () => {
      setTimeMachineLoading(true)
      setTimeMachineError(null)
      setTimeMachineResult(null)
      try {
        const data = await compareHistory({
          brand,
          model,
          fuelType,
          historicalDate: milestone,
          tankCapacity: customTankCapacity,
        })
        if (milestone !== selectedMilestone) return // stale response guard
        setTimeMachineResult(data)
      } catch (err) {
        if (milestone !== selectedMilestone) return
        setTimeMachineError(err.message)
      } finally {
        setTimeMachineLoading(false)
      }
    }
    run()
  }, [selectedMilestone, result]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset milestone when result changes (new calculation)
  useEffect(() => {
    setSelectedMilestone('')
  }, [result])

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
