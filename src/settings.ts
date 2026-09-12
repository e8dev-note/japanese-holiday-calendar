import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type JapaneseHolidayCalendarPlugin from './main';

export type WeekStart = 'sunday' | 'monday';

export interface CalendarSettings {
	weekStart: WeekStart;
	showHolidayNames: boolean;
	showEra: boolean;
	showLegend: boolean;
	confirmBeforeCreate: boolean;
}

export const DEFAULT_SETTINGS: CalendarSettings = {
	weekStart: 'sunday',
	showHolidayNames: true,
	showEra: true,
	showLegend: true,
	confirmBeforeCreate: false,
};

export class CalendarSettingTab extends PluginSettingTab {
	plugin: JapaneseHolidayCalendarPlugin;

	constructor(app: App, plugin: JapaneseHolidayCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<keyof CalendarSettings>[] {
		return [
			{
				name: 'Start week on',
				desc: 'Which day appears in the first column.',
				control: {
					type: 'dropdown',
					key: 'weekStart',
					options: { sunday: 'Sunday', monday: 'Monday' },
					defaultValue: DEFAULT_SETTINGS.weekStart,
				},
			},
			{
				name: 'Show holiday names',
				desc: 'Display the name of each holiday under the date.',
				control: {
					type: 'toggle',
					key: 'showHolidayNames',
					defaultValue: DEFAULT_SETTINGS.showHolidayNames,
				},
			},
			{
				name: 'Show Japanese era',
				desc: 'Display the era year (for example 令和8年) above the month.',
				control: {
					type: 'toggle',
					key: 'showEra',
					defaultValue: DEFAULT_SETTINGS.showEra,
				},
			},
			{
				name: 'Show legend',
				desc: 'Display the color legend below the calendar.',
				control: {
					type: 'toggle',
					key: 'showLegend',
					defaultValue: DEFAULT_SETTINGS.showLegend,
				},
			},
			{
				name: 'Confirm before creating a daily note',
				desc: 'Ask before creating a new daily note when the selected date has none yet.',
				control: {
					type: 'toggle',
					key: 'confirmBeforeCreate',
					defaultValue: DEFAULT_SETTINGS.confirmBeforeCreate,
				},
			},
		];
	}

	getControlValue(key: keyof CalendarSettings): unknown {
		return this.plugin.settings[key];
	}

	async setControlValue(key: keyof CalendarSettings, value: unknown): Promise<void> {
		Object.assign(this.plugin.settings, { [key]: value });
		await this.plugin.saveSettings();
	}
}
