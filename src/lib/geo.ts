import { normalizeArabic } from '@/lib/arabic';
import { toWesternDigits } from '@/lib/date/numerals';

export interface City {
  id: string;
  ar: string;
  en: string;
  lat: number;
  lon: number;
}

/** Gazetteer for حب بلا حدود: Iraqi cities plus cities where Iraqi families often live. */
export const CITIES: readonly City[] = [
  { id: 'baghdad', ar: 'بغداد', en: 'Baghdad', lat: 33.315, lon: 44.366 },
  { id: 'basra', ar: 'البصرة', en: 'Basra', lat: 30.508, lon: 47.783 },
  { id: 'erbil', ar: 'أربيل', en: 'Erbil', lat: 36.191, lon: 44.009 },
  { id: 'mosul', ar: 'الموصل', en: 'Mosul', lat: 36.34, lon: 43.13 },
  { id: 'najaf', ar: 'النجف', en: 'Najaf', lat: 31.996, lon: 44.314 },
  { id: 'karbala', ar: 'كربلاء', en: 'Karbala', lat: 32.616, lon: 44.024 },
  { id: 'sulaymaniyah', ar: 'السليمانية', en: 'Sulaymaniyah', lat: 35.557, lon: 45.435 },
  { id: 'kirkuk', ar: 'كركوك', en: 'Kirkuk', lat: 35.468, lon: 44.392 },
  { id: 'duhok', ar: 'دهوك', en: 'Duhok', lat: 36.867, lon: 42.988 },
  { id: 'hillah', ar: 'الحلة', en: 'Hillah', lat: 32.476, lon: 44.421 },
  { id: 'nasiriyah', ar: 'الناصرية', en: 'Nasiriyah', lat: 31.044, lon: 46.257 },
  { id: 'ramadi', ar: 'الرمادي', en: 'Ramadi', lat: 33.426, lon: 43.299 },
  { id: 'kut', ar: 'الكوت', en: 'Kut', lat: 32.505, lon: 45.824 },
  { id: 'amarah', ar: 'العمارة', en: 'Amarah', lat: 31.836, lon: 47.144 },
  { id: 'amman', ar: 'عمّان', en: 'Amman', lat: 31.954, lon: 35.911 },
  { id: 'beirut', ar: 'بيروت', en: 'Beirut', lat: 33.894, lon: 35.502 },
  { id: 'damascus', ar: 'دمشق', en: 'Damascus', lat: 33.513, lon: 36.292 },
  { id: 'istanbul', ar: 'إسطنبول', en: 'Istanbul', lat: 41.008, lon: 28.978 },
  { id: 'ankara', ar: 'أنقرة', en: 'Ankara', lat: 39.934, lon: 32.86 },
  { id: 'dubai', ar: 'دبي', en: 'Dubai', lat: 25.205, lon: 55.271 },
  { id: 'abu-dhabi', ar: 'أبوظبي', en: 'Abu Dhabi', lat: 24.454, lon: 54.377 },
  { id: 'doha', ar: 'الدوحة', en: 'Doha', lat: 25.285, lon: 51.531 },
  { id: 'kuwait', ar: 'الكويت', en: 'Kuwait City', lat: 29.376, lon: 47.977 },
  { id: 'riyadh', ar: 'الرياض', en: 'Riyadh', lat: 24.713, lon: 46.675 },
  { id: 'jeddah', ar: 'جدة', en: 'Jeddah', lat: 21.485, lon: 39.193 },
  { id: 'manama', ar: 'المنامة', en: 'Manama', lat: 26.228, lon: 50.586 },
  { id: 'muscat', ar: 'مسقط', en: 'Muscat', lat: 23.588, lon: 58.383 },
  { id: 'cairo', ar: 'القاهرة', en: 'Cairo', lat: 30.044, lon: 31.236 },
  { id: 'tehran', ar: 'طهران', en: 'Tehran', lat: 35.689, lon: 51.389 },
  { id: 'tbilisi', ar: 'تبليسي', en: 'Tbilisi', lat: 41.716, lon: 44.783 },
  { id: 'baku', ar: 'باكو', en: 'Baku', lat: 40.409, lon: 49.867 },
  { id: 'london', ar: 'لندن', en: 'London', lat: 51.507, lon: -0.128 },
  { id: 'manchester', ar: 'مانشستر', en: 'Manchester', lat: 53.481, lon: -2.243 },
  { id: 'paris', ar: 'باريس', en: 'Paris', lat: 48.857, lon: 2.352 },
  { id: 'berlin', ar: 'برلين', en: 'Berlin', lat: 52.52, lon: 13.405 },
  { id: 'hamburg', ar: 'هامبورغ', en: 'Hamburg', lat: 53.551, lon: 9.994 },
  { id: 'munich', ar: 'ميونخ', en: 'Munich', lat: 48.135, lon: 11.582 },
  { id: 'amsterdam', ar: 'أمستردام', en: 'Amsterdam', lat: 52.368, lon: 4.904 },
  { id: 'brussels', ar: 'بروكسل', en: 'Brussels', lat: 50.85, lon: 4.352 },
  { id: 'stockholm', ar: 'ستوكهولم', en: 'Stockholm', lat: 59.329, lon: 18.069 },
  { id: 'gothenburg', ar: 'غوتنبرغ', en: 'Gothenburg', lat: 57.709, lon: 11.975 },
  { id: 'malmo', ar: 'مالمو', en: 'Malmö', lat: 55.605, lon: 13.004 },
  { id: 'copenhagen', ar: 'كوبنهاغن', en: 'Copenhagen', lat: 55.676, lon: 12.568 },
  { id: 'oslo', ar: 'أوسلو', en: 'Oslo', lat: 59.914, lon: 10.752 },
  { id: 'helsinki', ar: 'هلسنكي', en: 'Helsinki', lat: 60.17, lon: 24.938 },
  { id: 'vienna', ar: 'فيينا', en: 'Vienna', lat: 48.208, lon: 16.374 },
  { id: 'zurich', ar: 'زيورخ', en: 'Zurich', lat: 47.377, lon: 8.541 },
  { id: 'rome', ar: 'روما', en: 'Rome', lat: 41.903, lon: 12.496 },
  { id: 'milan', ar: 'ميلانو', en: 'Milan', lat: 45.464, lon: 9.19 },
  { id: 'madrid', ar: 'مدريد', en: 'Madrid', lat: 40.417, lon: -3.704 },
  { id: 'athens', ar: 'أثينا', en: 'Athens', lat: 37.984, lon: 23.728 },
  { id: 'moscow', ar: 'موسكو', en: 'Moscow', lat: 55.756, lon: 37.617 },
  { id: 'new-york', ar: 'نيويورك', en: 'New York', lat: 40.713, lon: -74.006 },
  { id: 'detroit', ar: 'ديترويت', en: 'Detroit', lat: 42.331, lon: -83.046 },
  { id: 'dearborn', ar: 'ديربورن', en: 'Dearborn', lat: 42.322, lon: -83.176 },
  { id: 'chicago', ar: 'شيكاغو', en: 'Chicago', lat: 41.878, lon: -87.63 },
  { id: 'houston', ar: 'هيوستن', en: 'Houston', lat: 29.76, lon: -95.37 },
  { id: 'los-angeles', ar: 'لوس أنجلوس', en: 'Los Angeles', lat: 34.052, lon: -118.244 },
  { id: 'san-diego', ar: 'سان دييغو', en: 'San Diego', lat: 32.716, lon: -117.161 },
  { id: 'toronto', ar: 'تورونتو', en: 'Toronto', lat: 43.653, lon: -79.383 },
  { id: 'montreal', ar: 'مونتريال', en: 'Montreal', lat: 45.502, lon: -73.567 },
  { id: 'vancouver', ar: 'فانكوفر', en: 'Vancouver', lat: 49.283, lon: -123.121 },
  { id: 'sydney', ar: 'سيدني', en: 'Sydney', lat: -33.869, lon: 151.209 },
  { id: 'melbourne', ar: 'ملبورن', en: 'Melbourne', lat: -37.814, lon: 144.963 },
  { id: 'auckland', ar: 'أوكلاند', en: 'Auckland', lat: -36.849, lon: 174.763 },
  { id: 'kuala-lumpur', ar: 'كوالالمبور', en: 'Kuala Lumpur', lat: 3.139, lon: 101.687 },
];

export const DEFAULT_DESTINATION_CITY = 'baghdad';

/** Finds a city by id, Arabic name or English name. */
export function findCity(value: string | null | undefined): City | undefined {
  if (!value) return undefined;
  const key = normalizeArabic(value);
  return CITIES.find((c) => c.id === key || normalizeArabic(c.ar) === key || c.en.toLowerCase() === key);
}

/** "33.3, 44.4" → coordinates, for places missing from the list. */
export function parseLatLon(value: string): { lat: number; lon: number } | null {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(toWesternDigits(value));
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
