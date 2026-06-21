type BirthdayCard = {
  id: number;
  name: string;
  solarBirthday?: string | null;
  lunarBirthday?: string | null;
};

export type BirthdayReminderMatch = {
  cardId: number;
  cardName: string;
  birthdayType: 'solar' | 'lunar';
  birthdayDate: string;
  daysBefore: number;
};

const CN_NUM: Record<string, number> = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 冬: 11, 腊: 12 };
const CN_DAY: Record<string, number> = {
  初一: 1, 初二: 2, 初三: 3, 初四: 4, 初五: 5, 初六: 6, 初七: 7, 初八: 8, 初九: 9, 初十: 10,
  十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20,
  廿一: 21, 廿二: 22, 廿三: 23, 廿四: 24, 廿五: 25, 廿六: 26, 廿七: 27, 廿八: 28, 廿九: 29, 三十: 30,
};

function pad(n: number) { return String(n).padStart(2, '0'); }
export function formatDate(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseDaysBefore(value: unknown): number[] {
  const fallback = [7, 3, 1, 0];
  let arr: unknown = value;
  if (typeof value === 'string') {
    try { arr = JSON.parse(value); } catch { arr = fallback; }
  }
  if (!Array.isArray(arr)) return fallback;
  const normalized = [...new Set(arr.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 30))];
  return normalized.length ? normalized.sort((a, b) => b - a) : fallback;
}

export function solarBirthdayInYear(birthday: string | null | undefined, year: number): string | null {
  if (!birthday) return null;
  const m = String(birthday).match(/(\d{4})?[-/.年]?(\d{1,2})[-/.月](\d{1,2})/);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return formatDate(d);
}

function parseLunarText(text: string): { month: number; day: number } | null {
  const cleaned = text.replace(/农历|阴历|生日|月/g, '').trim();
  const numeric = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (numeric) return { month: Number(numeric[1]), day: Number(numeric[2]) };
  const monthChar = cleaned[0];
  const month = CN_NUM[monthChar];
  if (!month) return null;
  const dayText = cleaned.slice(1);
  const day = CN_DAY[dayText];
  if (!day) return null;
  return { month, day };
}

/**
 * 农历转阳历：优先用 Intl Chinese calendar 做本机转换。
 * 如果运行环境不支持，返回 null，调用方会跳过并记录为不可计算。
 */
export function lunarBirthdayInYear(lunarBirthday: string | null | undefined, year: number): string | null {
  if (!lunarBirthday) return null;
  const parsed = parseLunarText(lunarBirthday);
  if (!parsed) return null;
  const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'numeric', day: 'numeric' });
  for (let i = 0; i < 370; i += 1) {
    const d = addDays(new Date(year, 0, 1), i);
    const parts = formatter.formatToParts(d);
    const month = Number(parts.find(p => p.type === 'month')?.value);
    const day = Number(parts.find(p => p.type === 'day')?.value);
    if (month === parsed.month && day === parsed.day) return formatDate(d);
  }
  return null;
}

export function getBirthdayReminderMatches(cards: BirthdayCard[], today = new Date(), daysBefore = [7, 3, 1, 0]): BirthdayReminderMatch[] {
  const result: BirthdayReminderMatch[] = [];
  const todayKey = formatDate(today);
  for (const card of cards) {
    for (const days of daysBefore) {
      const target = addDays(today, days);
      const year = target.getFullYear();
      const targetKey = formatDate(target);
      const solar = solarBirthdayInYear(card.solarBirthday, year);
      if (solar === targetKey) result.push({ cardId: card.id, cardName: card.name, birthdayType: 'solar', birthdayDate: solar, daysBefore: days });
      const lunar = lunarBirthdayInYear(card.lunarBirthday, year);
      if (lunar === targetKey) result.push({ cardId: card.id, cardName: card.name, birthdayType: 'lunar', birthdayDate: lunar, daysBefore: days });
    }
  }
  return result.sort((a, b) => a.birthdayDate.localeCompare(b.birthdayDate) || b.daysBefore - a.daysBefore || a.cardId - b.cardId || a.birthdayType.localeCompare(b.birthdayType));
}
