export default function GoldenHourBanner({ alert }) {
  if (!alert?.isActive) return null
  return (
    <div className="bg-amber-400 text-amber-950 font-bold text-center py-3 px-4 rounded-2xl shadow-lg mb-5">
      <span className="text-2xl mr-2">⚠️</span>
      <span className="text-base leading-snug">{alert.message}</span>
    </div>
  )
}
