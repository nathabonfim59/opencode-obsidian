import { ItemView, WorkspaceLeaf } from 'obsidian';
import OpenCode from './main';

export const VIEW_TYPE_OPENCODE = 'opencode-view';

export class OpenCodeView extends ItemView {
	constructor(leaf: WorkspaceLeaf, private plugin: OpenCode) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_OPENCODE;
	}

	getDisplayText() {
		return 'Opencode';
	}

	async onOpen() {
		const container = this.contentEl;
		container.empty();
		container.addClass('opencode-view-container');

		const iframe = container.createEl('iframe', {
			cls: 'opencode-iframe',
		});

		iframe.src = this.plugin.getServerUrl();
		iframe.setAttribute('allow', 'clipboard-write;');
	}

	async onClose() {
		this.contentEl.empty();
	}
}
