import { useState, useEffect, useRef } from 'react'

export default function SearchableSelect({ options, value, onChange, placeholder, disabled, dark = false }) {
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
