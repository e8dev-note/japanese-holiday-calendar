import { App, Modal, Setting } from 'obsidian';
import { getLabels } from './labels';

/** Simple yes/no dialog that resolves to `true` when confirmed. */
export class ConfirmModal extends Modal {
	private resolve: ((value: boolean) => void) | null = null;
	private confirmed = false;

	constructor(
		app: App,
		private readonly title: string,
		private readonly body: string,
		private readonly confirmLabel: string,
	) {
		super(app);
	}

	openAndWait(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		this.setTitle(this.title);
		this.contentEl.createEl('p', { text: this.body });
		new Setting(this.contentEl)
			.addButton((button) =>
				button.setButtonText(getLabels().cancel).onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText(this.confirmLabel)
					.setCta()
					.onClick(() => {
						this.confirmed = true;
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolve?.(this.confirmed);
		this.resolve = null;
	}
}
