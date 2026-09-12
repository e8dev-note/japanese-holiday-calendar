import {
	HoverPopover,
	ItemView,
	Keymap,
	Notice,
	PaneType,
	TFile,
	WorkspaceLeaf,
	debounce,
	setIcon,
} from 'obsidian';
import type JapaneseHolidayCalendarPlugin from './main';
import { createDailyNote, getDailyNote, getDailyNoteConfig } from './daily';
import { dateToKey, getHolidays } from './holidays';
import { getLabels } from './labels';
import { ConfirmModal } from './confirm-modal';

export const VIEW_TYPE_CALENDAR = 'japanese-holiday-calendar';

const CELL_COUNT = 42; // 6 rows x 7 days

const ERA_FORMAT = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
	era: 'long',
	year: 'numeric',
});

export class CalendarView extends ItemView {
	hoverPopover: HoverPopover | null = null;

	private readonly plugin: JapaneseHolidayCalendarPlugin;
	private year: number;
	private month: number; // 1-12
	private todayKey = '';
	private rootEl: HTMLElement | null = null;

	private readonly scheduleRender = debounce(() => this.render(), 200, true);

	constructor(leaf: WorkspaceLeaf, plugin: JapaneseHolidayCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		const now = new Date();
		this.year = now.getFullYear();
		this.month = now.getMonth() + 1;
		this.navigation = false;
	}

	getViewType(): string {
		return VIEW_TYPE_CALENDAR;
	}

	getDisplayText(): string {
		return getLabels().viewTitle;
	}

	getIcon(): string {
		return 'calendar';
	}

	onOpen(): Promise<void> {
		this.rootEl = this.contentEl.createDiv({ cls: 'jhc-root' });
		this.render();

		// Daily notes may be created or removed from anywhere in the app.
		this.registerEvent(this.app.vault.on('create', this.scheduleRender));
		this.registerEvent(this.app.vault.on('delete', this.scheduleRender));
		this.registerEvent(this.app.vault.on('rename', this.scheduleRender));

		// Keep the "today" marker correct when the view stays open past midnight.
		this.registerInterval(
			window.setInterval(() => {
				if (dateToKey(new Date()) !== this.todayKey) this.render();
			}, 60 * 1000),
		);
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		this.rootEl = null;
		return Promise.resolve();
	}

	/** Re-renders the whole calendar. Cheap: 42 cells. */
	render(): void {
		const root = this.rootEl;
		if (!root) return;
		root.empty();

		const labels = getLabels();
		const today = new Date();
		this.todayKey = dateToKey(today);
		const settings = this.plugin.settings;
		const config = getDailyNoteConfig(this.app);

		// Header: era + month title, navigation buttons.
		const header = root.createDiv({ cls: 'jhc-header' });
		const titleEl = header.createDiv({ cls: 'jhc-title' });
		const firstOfMonth = new Date(this.year, this.month - 1, 1);
		if (settings.showEra) {
			titleEl.createDiv({ cls: 'jhc-era', text: ERA_FORMAT.format(firstOfMonth) });
		}
		titleEl.createDiv({
			cls: 'jhc-month',
			text: labels.monthTitle(this.year, this.month),
		});

		const nav = header.createDiv({ cls: 'jhc-nav' });
		const prevBtn = nav.createEl('button', {
			cls: 'jhc-nav-button',
			attr: { 'aria-label': labels.previousMonth },
		});
		setIcon(prevBtn, 'chevron-left');
		const todayBtn = nav.createEl('button', {
			cls: 'jhc-nav-button jhc-nav-today',
			text: labels.today,
			attr: { 'aria-label': labels.goToToday },
		});
		const nextBtn = nav.createEl('button', {
			cls: 'jhc-nav-button',
			attr: { 'aria-label': labels.nextMonth },
		});
		setIcon(nextBtn, 'chevron-right');

		this.registerDomEvent(prevBtn, 'click', () => this.shiftMonth(-1));
		this.registerDomEvent(nextBtn, 'click', () => this.shiftMonth(1));
		this.registerDomEvent(todayBtn, 'click', () => {
			this.year = today.getFullYear();
			this.month = today.getMonth() + 1;
			this.render();
		});

		// Weekday header row.
		const startDow = settings.weekStart === 'monday' ? 1 : 0;
		const weekdays = root.createDiv({ cls: 'jhc-weekdays' });
		for (let i = 0; i < 7; i++) {
			const dow = (startDow + i) % 7;
			weekdays.createDiv({
				cls: ['jhc-weekday', dowClass(dow)],
				text: labels.weekdays[dow] ?? '',
			});
		}

		// Day grid.
		const grid = root.createDiv({ cls: 'jhc-grid' });
		const offset = (firstOfMonth.getDay() - startDow + 7) % 7;
		const cursor = new Date(this.year, this.month - 1, 1 - offset);
		const holidays = new Map([
			...getHolidays(cursor.getFullYear()),
			...getHolidays(this.year),
			...getHolidays(this.year + 1),
		]);

		for (let i = 0; i < CELL_COUNT; i++) {
			const date = new Date(cursor);
			const key = dateToKey(date);
			const holiday = holidays.get(key);
			const note = config ? getDailyNote(this.app, config, date) : null;
			const dow = date.getDay();

			const classes = ['jhc-cell', dowClass(dow)];
			if (date.getMonth() + 1 !== this.month) classes.push('jhc-other-month');
			if (holiday) classes.push('jhc-holiday');
			if (key === this.todayKey) classes.push('jhc-today');
			if (note) classes.push('jhc-has-note');

			const ariaLabel = [labels.dateLabel(date), holiday]
				.filter(Boolean)
				.join(' ');
			const cell = grid.createDiv({
				cls: classes,
				attr: {
					role: 'button',
					tabindex: '0',
					'aria-label': ariaLabel,
					'data-date': key,
				},
			});
			cell.createSpan({ cls: 'jhc-day', text: String(date.getDate()) });
			if (holiday && settings.showHolidayNames) {
				cell.createSpan({ cls: 'jhc-label', text: holiday, attr: { title: holiday } });
			}
			if (note) cell.createSpan({ cls: 'jhc-dot' });

			this.registerDomEvent(cell, 'click', (evt) => {
				void this.openDailyNote(date, Keymap.isModEvent(evt));
			});
			this.registerDomEvent(cell, 'keydown', (evt) => {
				if (evt.key === 'Enter' || evt.key === ' ') {
					evt.preventDefault();
					void this.openDailyNote(date, Keymap.isModEvent(evt));
				}
			});
			if (note) {
				this.registerDomEvent(cell, 'mouseover', (evt) => {
					this.app.workspace.trigger('hover-link', {
						event: evt,
						source: VIEW_TYPE_CALENDAR,
						hoverParent: this,
						targetEl: cell,
						linktext: note.path,
					});
				});
			}

			cursor.setDate(cursor.getDate() + 1);
		}

		if (settings.showLegend) {
			const legend = root.createDiv({ cls: 'jhc-legend' });
			for (const [cls, text] of [
				['jhc-legend-today', labels.legendToday],
				['jhc-legend-holiday', labels.legendHoliday],
				['jhc-legend-sat', labels.legendSaturday],
			] as const) {
				const item = legend.createSpan({ cls: 'jhc-legend-item' });
				item.createSpan({ cls: ['jhc-legend-dot', cls] });
				item.createSpan({ text });
			}
		}
	}

	private shiftMonth(delta: number): void {
		const next = new Date(this.year, this.month - 1 + delta, 1);
		this.year = next.getFullYear();
		this.month = next.getMonth() + 1;
		this.render();
	}

	private async openDailyNote(
		date: Date,
		newLeaf: PaneType | boolean,
	): Promise<void> {
		const labels = getLabels();
		const config = getDailyNoteConfig(this.app);
		if (!config) {
			new Notice(labels.dailyNotesDisabled);
			return;
		}

		let file: TFile | null = getDailyNote(this.app, config, date);
		if (!file) {
			if (this.plugin.settings.confirmBeforeCreate) {
				const ok = await new ConfirmModal(
					this.app,
					labels.confirmCreateTitle,
					labels.confirmCreateBody(labels.dateLabel(date)),
					labels.create,
				).openAndWait();
				if (!ok) return;
			}
			try {
				file = await createDailyNote(this.app, config, date);
			} catch (error) {
				new Notice(labels.createFailed);
				console.error(error);
				return;
			}
		}

		await this.app.workspace.getLeaf(newLeaf).openFile(file);
	}
}

function dowClass(dow: number): string {
	if (dow === 0) return 'jhc-sun';
	if (dow === 6) return 'jhc-sat';
	return 'jhc-weekday-day';
}
