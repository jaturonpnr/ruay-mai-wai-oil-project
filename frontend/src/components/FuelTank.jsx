// currentLevel = existing fuel (amber zone, bottom)
// fillAmount   = fuel being added (green zone, above current)
// When currentLevel is not provided, single-zone display (legacy).
export default function FuelTank({ currentLevel = 0, fillAmount = 0 }) {
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
