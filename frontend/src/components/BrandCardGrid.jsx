import { PRIORITY_BRANDS, BRAND_CARD_CONFIG } from '../constants'

export default function BrandCardGrid({ selectedBrand, onSelect }) {
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
