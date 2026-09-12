import { moment } from 'obsidian';

export interface Labels {
	viewTitle: string;
	weekdays: string[];
	monthTitle: (year: number, month: number) => string;
	dateLabel: (date: Date) => string;
	today: string;
	goToToday: string;
	previousMonth: string;
	nextMonth: string;
	legendToday: string;
	legendHoliday: string;
	legendSaturday: string;
	dailyNotesDisabled: string;
	confirmCreateTitle: string;
	confirmCreateBody: (dateLabel: string) => string;
	create: string;
	cancel: string;
	createFailed: string;
}

const ja: Labels = {
	viewTitle: '日本の祝日カレンダー',
	weekdays: ['日', '月', '火', '水', '木', '金', '土'],
	monthTitle: (year, month) => `${year}年${month}月`,
	dateLabel: (date) => moment(date).format('YYYY年M月D日(ddd)'),
	today: '今日',
	goToToday: '今日に移動',
	previousMonth: '前の月',
	nextMonth: '次の月',
	legendToday: '今日',
	legendHoliday: '祝日',
	legendSaturday: '土曜',
	dailyNotesDisabled:
		'デイリーノートを開くには、コアプラグイン「デイリーノート」を有効にしてください。',
	confirmCreateTitle: 'デイリーノートを作成',
	confirmCreateBody: (dateLabel) => `${dateLabel} のデイリーノートを作成しますか？`,
	create: '作成',
	cancel: 'キャンセル',
	createFailed: 'デイリーノートを作成できませんでした。',
};

const en: Labels = {
	viewTitle: 'Japanese holiday calendar',
	weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	monthTitle: (year, month) =>
		new Date(year, month - 1, 1).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
		}),
	dateLabel: (date) => moment(date).format('ddd, MMM D, YYYY'),
	today: 'Today',
	goToToday: 'Go to today',
	previousMonth: 'Previous month',
	nextMonth: 'Next month',
	legendToday: 'Today',
	legendHoliday: 'Holiday',
	legendSaturday: 'Saturday',
	dailyNotesDisabled:
		'Enable the Daily notes core plugin to open daily notes from the calendar.',
	confirmCreateTitle: 'Create daily note',
	confirmCreateBody: (dateLabel) => `Create the daily note for ${dateLabel}?`,
	create: 'Create',
	cancel: 'Cancel',
	createFailed: 'Could not create the daily note.',
};

/** Labels follow the app language (Japanese or English). */
export function getLabels(): Labels {
	return moment.locale().startsWith('ja') ? ja : en;
}
