import {App, PluginSettingTab, Setting} from "obsidian";
import OpenCode from "./main";

export interface OpenCodeSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: OpenCodeSettings = {
	mySetting: 'default'
}

export class OpenCodeSettingTab extends PluginSettingTab {
	plugin: OpenCode;

	constructor(app: App, plugin: OpenCode) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
