import { App, Notice, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import OpenCode from "./main";

export interface OpenCodeSettings {
  serverHost: string;
  serverPort: number;
  serverProtocol: 'http' | 'https';
  serverPasswordSecretName: string;
}

export const DEFAULT_SETTINGS: OpenCodeSettings = {
  serverHost: 'localhost',
  serverPort: 4096,
  serverProtocol: 'http',
  serverPasswordSecretName: '',
}

export class OpenCodeSettingTab extends PluginSettingTab {
	plugin: OpenCode;

	constructor(app: App, plugin: OpenCode) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
  const { containerEl } = this;
  containerEl.empty();

  new Setting(containerEl)
    .setName('Server host')
    .setDesc('OpenCode server hostname or IP address')
    .addText(text => text
      .setPlaceholder('localhost')
      .setValue(this.plugin.settings.serverHost)
      .onChange(async (value) => {
        this.plugin.settings.serverHost = value;
        await this.plugin.saveSettings();
        await this.plugin.testConnection();
        this.plugin.updateStatusBar();
      }));

  new Setting(containerEl)
    .setName('Server port')
    .setDesc('OpenCode server port')
    .addText(text => text
      .setPlaceholder('4096')
      .setValue(this.plugin.settings.serverPort.toString())
      .onChange(async (value) => {
        const port = parseInt(value, 10);
        if (!isNaN(port)) {
          this.plugin.settings.serverPort = port;
          await this.plugin.saveSettings();
          await this.plugin.testConnection();
          this.plugin.updateStatusBar();
        }
      }));

  new Setting(containerEl)
    .setName('Protocol')
    .setDesc('Connection protocol')
    .addDropdown(dropdown => dropdown
      .addOption('http', 'HTTP')
      .addOption('https', 'HTTPS')
      .setValue(this.plugin.settings.serverProtocol)
      .onChange(async (value) => {
        this.plugin.settings.serverProtocol = value as 'http' | 'https';
        await this.plugin.saveSettings();
        await this.plugin.testConnection();
        this.plugin.updateStatusBar();
      }));

  new Setting(containerEl)
    .setName('Server password')
    .setDesc('Select a secret from secret storage for basic authentication')
    .addComponent(el => new SecretComponent(this.app, el)
      .setValue(this.plugin.settings.serverPasswordSecretName)
      .onChange(async (value) => {
        this.plugin.settings.serverPasswordSecretName = value;
        await this.plugin.saveSettings();
        await this.plugin.testConnection();
        this.plugin.updateStatusBar();
      }));

  new Setting(containerEl)
    .addButton(button => button
      .setButtonText('Test connection')
      .onClick(async () => {
        const success = await this.plugin.testConnection();
        new Notice(success ? '✓ Connected!' : '✗ Connection failed', 5000);
      }));
}
}
