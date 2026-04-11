export const API_URL = import.meta.env.VITE_API_URL || ''

export const PRIORITY_BRANDS = ['Toyota', 'Honda', 'Mazda', 'Isuzu']

export const FUEL_TYPES = [
  'Gasohol91',
  'Gasohol95',
  'E20',
  'E85',
  'Diesel',
  'Diesel B10',
  'Hi Premium 97',
  'NGV',
]

export const MILESTONES = [
  { label: "🚨 ก่อนคืนลักหลับขึ้น 6 บาท (25 มี.ค. 2026)", date: "2026-03-25" },
  { label: "💸 วัน 'พอแล้วๆๆ รวยไม่ไหวแล้ว!' (12 ก.พ. 2026)",  date: "2026-02-12" },
  { label: "📅 ต้นปีนี้ (1 ม.ค. 2026)",                       date: "2026-01-01" },
]

export const DISPLAY_STATIONS = ['PTT', 'Bangchak']

export const FUEL_TYPE_LABELS = {
  Gasohol95:     'Gasohol 95',
  Gasohol91:     'Gasohol 91',
  E20:           'E20',
  E85:           'E85',
  Diesel:        'Diesel B7',
  'Diesel B10':  'Diesel B10',
}

export const BRAND_CARD_CONFIG = [
  { brand: 'Toyota', logo: '/logo/toyota_logo_transparent.png' },
  { brand: 'Honda',  logo: '/logo/honda_logo_transparent.png'  },
  { brand: 'Mazda',  logo: '/logo/mazda_logo_transparent.png'  },
  { brand: 'Isuzu',  logo: '/logo/isuzu_logo_transparent.png'  },
  { brand: 'อื่นๆ', logo: null                                 },
]

export const PRESET_ROUTES = [
  { label: 'กรุงเทพ → เชียงใหม่',      distance: 700  },
  { label: 'กรุงเทพ → ขอนแก่น',        distance: 445  },
  { label: 'กรุงเทพ → อุดรธานี',       distance: 561  },
  { label: 'กรุงเทพ → โคราช',          distance: 260  },
  { label: 'กรุงเทพ → หาดใหญ่',        distance: 950  },
  { label: 'กรุงเทพ → สุราษฎร์ธานี',  distance: 645  },
  { label: 'กรุงเทพ → พัทยา',          distance: 140  },
  { label: 'กรุงเทพ → หัวหิน',         distance: 200  },
  { label: 'กรุงเทพ → กาญจนบุรี',      distance: 130  },
]

export const QUICK_PRESETS = [0.5, 1.0, 2.0, 3.0, 3.5]

export const GAUGE_PRESETS = [
  { label: 'E',  value: 0  },
  { label: '¼',  value: 25 },
  { label: '½',  value: 50 },
  { label: '¾',  value: 75 },
]
