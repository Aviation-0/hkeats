CREATE TABLE IF NOT EXISTS restaurants (
  license_no TEXT PRIMARY KEY,
  type TEXT,
  district TEXT,
  name_en TEXT NOT NULL,
  address_en TEXT NOT NULL,
  expiry_date TEXT,
  status TEXT DEFAULT 'CLEAN', -- 'CLEAN', 'DEMERIT_WARNING', 'SUSPENDED'
  suspension_details TEXT,
  lat REAL,
  lng REAL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_name ON restaurants(name_en);
CREATE INDEX IF NOT EXISTS idx_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_district ON restaurants(district);
