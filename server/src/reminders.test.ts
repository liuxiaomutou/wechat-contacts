import assert from 'assert';
import { getBirthdayReminderMatches } from './utils/birthday';

const today = new Date('2026-06-21T08:00:00+08:00');

const cards = [
  { id: 1, name: '今日阳历', solarBirthday: '1990-06-21', lunarBirthday: null },
  { id: 2, name: '三天后阳历', solarBirthday: '1990-06-24', lunarBirthday: null },
  { id: 3, name: '一周后阳历', solarBirthday: '1990-06-28', lunarBirthday: null },
  { id: 4, name: '无生日', solarBirthday: null, lunarBirthday: null },
];

const matches = getBirthdayReminderMatches(cards as any[], today, [7, 3, 1, 0]);
assert.deepStrictEqual(matches.map(m => `${m.cardId}:${m.daysBefore}:${m.birthdayType}`).sort(), [
  '1:0:solar',
  '2:3:solar',
  '3:7:solar',
]);
assert.strictEqual(matches[0].birthdayDate.length, 10);

console.log('birthday reminder tests passed');
