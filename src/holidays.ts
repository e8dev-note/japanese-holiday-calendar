/**
 * Japanese public holidays (国民の祝日), computed from the Act on National
 * Holidays (国民の祝日に関する法律) and its amendments. No network access,
 * no external data files.
 *
 * Covers 1949 onwards. Equinox dates use the standard approximation
 * formula, which matches the official dates through 2099.
 */

/** ISO-like key used throughout the plugin: `YYYY-MM-DD` (local date). */
export type DateKey = string;

/** Maps a `DateKey` to the holiday's name. */
export type HolidayMap = Map<DateKey, string>;

export function toDateKey(year: number, month: number, day: number): DateKey {
	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}

export function dateToKey(date: Date): DateKey {
	return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function dayOfWeek(year: number, month: number, day: number): number {
	return new Date(year, month - 1, day).getDay();
}

/** Day of month of the n-th Monday of the given month. */
function nthMonday(year: number, month: number, n: number): number {
	const firstDow = dayOfWeek(year, month, 1);
	const firstMonday = 1 + ((8 - firstDow) % 7);
	return firstMonday + (n - 1) * 7;
}

/** 春分の日 (day of March). */
export function vernalEquinoxDay(year: number): number {
	if (year <= 1979) {
		return Math.floor(
			20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4),
		);
	}
	return Math.floor(
		20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
	);
}

/** 秋分の日 (day of September). */
export function autumnalEquinoxDay(year: number): number {
	if (year <= 1979) {
		return Math.floor(
			23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4),
		);
	}
	return Math.floor(
		23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
	);
}

type Entry = [month: number, day: number, name: string];

/** Holidays defined directly by law for the year (before substitutes). */
function baseHolidays(year: number): Entry[] {
	const list: Entry[] = [];
	const add = (month: number, day: number, name: string) =>
		list.push([month, day, name]);

	add(1, 1, '元日');

	// 成人の日
	if (year >= 2000) add(1, nthMonday(year, 1, 2), '成人の日');
	else add(1, 15, '成人の日');

	// 建国記念の日
	if (year >= 1967) add(2, 11, '建国記念の日');

	// 天皇誕生日
	if (year >= 2020) add(2, 23, '天皇誕生日');
	else if (year >= 1989 && year <= 2018) add(12, 23, '天皇誕生日');
	else if (year <= 1988) add(4, 29, '天皇誕生日');

	add(3, vernalEquinoxDay(year), '春分の日');

	// 4/29: 天皇誕生日 → みどりの日 → 昭和の日
	if (year >= 2007) add(4, 29, '昭和の日');
	else if (year >= 1989) add(4, 29, 'みどりの日');

	add(5, 3, '憲法記念日');
	if (year >= 2007) add(5, 4, 'みどりの日');
	add(5, 5, 'こどもの日');

	// 海の日
	if (year === 2020) add(7, 23, '海の日');
	else if (year === 2021) add(7, 22, '海の日');
	else if (year >= 2003) add(7, nthMonday(year, 7, 3), '海の日');
	else if (year >= 1996) add(7, 20, '海の日');

	// 山の日
	if (year === 2020) add(8, 10, '山の日');
	else if (year === 2021) add(8, 8, '山の日');
	else if (year >= 2016) add(8, 11, '山の日');

	// 敬老の日
	if (year >= 2003) add(9, nthMonday(year, 9, 3), '敬老の日');
	else if (year >= 1966) add(9, 15, '敬老の日');

	add(9, autumnalEquinoxDay(year), '秋分の日');

	// 体育の日 → スポーツの日
	if (year === 2020) add(7, 24, 'スポーツの日');
	else if (year === 2021) add(7, 23, 'スポーツの日');
	else if (year >= 2020) add(10, nthMonday(year, 10, 2), 'スポーツの日');
	else if (year >= 2000) add(10, nthMonday(year, 10, 2), '体育の日');
	else if (year >= 1966) add(10, 10, '体育の日');

	add(11, 3, '文化の日');
	add(11, 23, '勤労感謝の日');

	// One-off holidays established by special laws.
	if (year === 1959) add(4, 10, '皇太子明仁親王の結婚の儀');
	if (year === 1989) add(2, 24, '昭和天皇の大喪の礼');
	if (year === 1990) add(11, 12, '即位礼正殿の儀');
	if (year === 1993) add(6, 9, '皇太子徳仁親王の結婚の儀');
	if (year === 2019) {
		add(5, 1, '天皇の即位の日');
		add(10, 22, '即位礼正殿の儀');
	}

	return list;
}

const cache = new Map<number, HolidayMap>();

/**
 * All holidays for a year, including 振替休日 (substitute holidays) and
 * 国民の休日 (citizens' holidays). Results are cached per year.
 */
export function getHolidays(year: number): HolidayMap {
	const cached = cache.get(year);
	if (cached) return cached;

	const base: HolidayMap = new Map();
	for (const [m, d, name] of baseHolidays(year)) {
		base.set(toDateKey(year, m, d), name);
	}
	const result: HolidayMap = new Map(base);

	// 振替休日: in force since 1973-04-12. A holiday falling on Sunday moves
	// to the next day. Since 2007, it moves to the first day that is not
	// already a holiday; before that, only the immediately following day.
	for (const [m, d] of baseHolidays(year)) {
		if (dayOfWeek(year, m, d) !== 0) continue;
		if (year < 1973 || (year === 1973 && (m < 4 || (m === 4 && d < 12)))) {
			continue;
		}
		const cursor = new Date(year, m - 1, d + 1);
		if (year >= 2007) {
			while (base.has(dateToKey(cursor))) {
				cursor.setDate(cursor.getDate() + 1);
			}
			result.set(dateToKey(cursor), '振替休日');
		} else if (!base.has(dateToKey(cursor))) {
			result.set(dateToKey(cursor), '振替休日');
		}
	}

	// 国民の休日: in force since 1985-12-27. A weekday sandwiched between two
	// holidays (as defined by law, not substitutes) becomes a holiday.
	if (year >= 1986) {
		const cursor = new Date(year, 0, 2);
		while (cursor.getFullYear() === year) {
			const key = dateToKey(cursor);
			if (!result.has(key) && cursor.getDay() !== 0) {
				const prev = new Date(cursor);
				prev.setDate(prev.getDate() - 1);
				const next = new Date(cursor);
				next.setDate(next.getDate() + 1);
				if (base.has(dateToKey(prev)) && base.has(dateToKey(next))) {
					result.set(key, '国民の休日');
				}
			}
			cursor.setDate(cursor.getDate() + 1);
		}
	}

	cache.set(year, result);
	return result;
}

/** Holiday name for the date, or `undefined` when it is not a holiday. */
export function getHolidayName(date: Date): string | undefined {
	return getHolidays(date.getFullYear()).get(dateToKey(date));
}
