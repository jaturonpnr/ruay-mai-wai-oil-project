import { DISPLAY_STATIONS, FUEL_TYPE_LABELS } from '../constants'

export default function PriceComparisonTable({ prices }) {
  if (!prices?.length) return (
    <div className="text-center text-gray-400 text-sm py-4">กำลังโหลดราคาน้ำมัน...</div>
  )

  const fuelTypes = [...new Set(
    prices.filter(p => DISPLAY_STATIONS.includes(p.stationBrand)).map(p => p.fuelType)
  )]

  const priceMap = {}
  for (const p of prices) {
    if (!DISPLAY_STATIONS.includes(p.stationBrand)) continue
    if (!priceMap[p.fuelType]) priceMap[p.fuelType] = {}
    priceMap[p.fuelType][p.stationBrand] = p
  }

  const getTomorrow = (fuelType) => priceMap[fuelType]?.PTT?.tomorrowPriceDifference ?? null

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
