import { App, TFile, TFolder, normalizePath } from 'obsidian';
import { moment } from './moment';

export interface DailyNoteConfig {
	folder: string;
	format: string;
	template: string;
}

const DEFAULT_FORMAT = 'YYYY-MM-DD';

interface DailyNotesOptions {
	folder?: string;
	format?: string;
	template?: string;
}

/**
 * Reads the daily note configuration from the Periodic Notes community
 * plugin (if its daily notes are enabled) or the core Daily notes plugin.
 * Returns `null` when neither is enabled.
 */
export function getDailyNoteConfig(app: App): DailyNoteConfig | null {
	// These internal settings objects are not part of the public API, so
	// access is kept defensive and typed as `unknown`.
	const periodic = (
		app as unknown as {
			plugins?: {
				getPlugin?: (id: string) => unknown;
			};
		}
	).plugins?.getPlugin?.('periodic-notes') as
		| { settings?: { daily?: DailyNotesOptions & { enabled?: boolean } } }
		| null
		| undefined;
	const periodicDaily = periodic?.settings?.daily;
	if (periodicDaily?.enabled) {
		return normalizeConfig(periodicDaily);
	}

	const internal = (
		app as unknown as {
			internalPlugins?: {
				getPluginById?: (id: string) => unknown;
			};
		}
	).internalPlugins?.getPluginById?.('daily-notes') as
		| { enabled?: boolean; instance?: { options?: DailyNotesOptions } }
		| null
		| undefined;
	if (internal?.enabled) {
		return normalizeConfig(internal.instance?.options ?? {});
	}

	return null;
}

function normalizeConfig(options: DailyNotesOptions): DailyNoteConfig {
	return {
		folder: (options.folder ?? '').trim(),
		format: (options.format ?? '').trim() || DEFAULT_FORMAT,
		template: (options.template ?? '').trim(),
	};
}

export function getDailyNotePath(config: DailyNoteConfig, date: Date): string {
	const name = moment(date).format(config.format);
	const path = config.folder ? `${config.folder}/${name}` : name;
	return normalizePath(`${path}.md`);
}

export function getDailyNote(
	app: App,
	config: DailyNoteConfig,
	date: Date,
): TFile | null {
	const file = app.vault.getAbstractFileByPath(getDailyNotePath(config, date));
	return file instanceof TFile ? file : null;
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	if (!folderPath) return;
	const existing = app.vault.getAbstractFileByPath(folderPath);
	if (existing instanceof TFolder) return;
	await app.vault.createFolder(folderPath);
}

async function readTemplate(app: App, template: string): Promise<string> {
	if (!template) return '';
	const file =
		app.metadataCache.getFirstLinkpathDest(template, '') ??
		app.vault.getAbstractFileByPath(normalizePath(`${template}.md`));
	if (!(file instanceof TFile)) return '';
	return app.vault.cachedRead(file);
}

/** Expands the template variables supported by the core Daily notes plugin. */
export function applyTemplate(
	content: string,
	date: Date,
	title: string,
): string {
	const now = moment();
	const target = moment(date);
	return content
		.replace(
			/{{\s*(date|time)\s*(?::\s*([^}]+?))?\s*}}/gi,
			(_match, kind: string, fmt?: string) => {
				if (kind.toLowerCase() === 'time') {
					return now.format(fmt ?? 'HH:mm');
				}
				return target.format(fmt ?? DEFAULT_FORMAT);
			},
		)
		.replace(/{{\s*title\s*}}/gi, title)
		.replace(
			/{{\s*yesterday\s*(?::\s*([^}]+?))?\s*}}/gi,
			(_match, fmt?: string) =>
				target.clone().subtract(1, 'day').format(fmt ?? DEFAULT_FORMAT),
		)
		.replace(
			/{{\s*tomorrow\s*(?::\s*([^}]+?))?\s*}}/gi,
			(_match, fmt?: string) =>
				target.clone().add(1, 'day').format(fmt ?? DEFAULT_FORMAT),
		);
}

export async function createDailyNote(
	app: App,
	config: DailyNoteConfig,
	date: Date,
): Promise<TFile> {
	const path = getDailyNotePath(config, date);
	const folder = path.slice(0, path.lastIndexOf('/'));
	await ensureFolder(app, folder);
	const title = path.slice(path.lastIndexOf('/') + 1, -'.md'.length);
	const content = applyTemplate(await readTemplate(app, config.template), date, title);
	return app.vault.create(path, content);
}
