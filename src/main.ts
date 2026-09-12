import { Plugin } from 'obsidian';
import { CalendarSettingTab, CalendarSettings, DEFAULT_SETTINGS } from './settings';
import { CalendarView, VIEW_TYPE_CALENDAR } from './view';

export default class JapaneseHolidayCalendarPlugin extends Plugin {
	settings: CalendarSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarView(leaf, this));
		this.registerHoverLinkSource(VIEW_TYPE_CALENDAR, {
			display: 'Japanese Holiday Calendar',
			defaultMod: false,
		});

		this.addRibbonIcon('calendar', 'Open Japanese holiday calendar', () => {
			void this.activateView();
		});
		this.addCommand({
			id: 'open-calendar',
			name: 'Open calendar',
			callback: () => void this.activateView(),
		});

		this.addSettingTab(new CalendarSettingTab(this.app, this));
	}

	onunload(): void {
		// Leaves of this view type are detached by Obsidian automatically.
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CalendarSettings> | null,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.rerenderViews();
	}

	private rerenderViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)) {
			if (leaf.view instanceof CalendarView) leaf.view.render();
		}
	}

	/** Opens the calendar in the right sidebar, or reveals it if already open. */
	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
		}
		await workspace.revealLeaf(leaf);
	}
}
