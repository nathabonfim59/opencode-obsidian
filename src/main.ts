import { App, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, OpenCodeSettings, OpenCodeSettingTab } from "./settings";
import { getDarkLogo, getLightLogo } from "./utils";

export default class OpenCode extends Plugin {
	settings: OpenCodeSettings;
	statusBarItemEl: HTMLElement | null = null;
	connectionStatus: 'checking' | 'connected' | 'disconnected' = 'checking';
	healthCheckInterval: number | null = null;
	static readonly HEALTH_CHECK_INTERVAL_MS = 30000;
	static readonly CONNECTION_TIMEOUT_MS = 5000;

	async onload() {
		await this.loadSettings();

		this.setupStatusBar();
		this.startHealthCheck();

		this.addSettingTab(new OpenCodeSettingTab(this.app, this));
	}

	onunload() {
		this.stopHealthCheck();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<OpenCodeSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getServerUrl(): string {
		return `${this.settings.serverProtocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
	}

	async testConnection(): Promise<boolean> {
		const password = this.settings.serverPasswordSecretName
			? this.app.secretStorage.getSecret(this.settings.serverPasswordSecretName)
			: null;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), OpenCode.CONNECTION_TIMEOUT_MS);

		try {
			const headers: HeadersInit = {};
			if (password) {
				headers['Authorization'] = `Basic ${btoa('opencode:' + password)}`;
			}

			const response = await fetch(`${this.getServerUrl()}/global/health`, {
				method: 'GET',
				headers,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				this.connectionStatus = 'connected';
				this.updateStatusBar();
				return true;
			} else {
				this.connectionStatus = 'disconnected';
				this.updateStatusBar();
				return false;
			}
		} catch (error) {
			clearTimeout(timeoutId);
			this.connectionStatus = 'disconnected';
			this.updateStatusBar();
			return false;
		}
	}

	setupStatusBar(): void {
		this.statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar();

		this.statusBarItemEl.addEventListener('click', () => {
			new Notice('OpenCode Settings: ' + this.getServerUrl());
		});
	}

	updateStatusBar(): void {
		if (!this.statusBarItemEl) return;

		const isDark = document.body.classList.contains('theme-dark');
		const logoUrl = isDark ? getDarkLogo() : getLightLogo();

		let statusDot = '';
		let tooltipText = 'OpenCode - ';
		let isPulsing = false;

		switch (this.connectionStatus) {
			case 'checking':
				statusDot = `<span style="color: var(--text-error); animation: pulse 1s infinite;">●</span>`;
				tooltipText += 'Checking...';
				isPulsing = true;
				break;
			case 'connected':
				statusDot = `<span style="color: var(--text-success);">●</span>`;
				tooltipText += `Connected to ${this.settings.serverProtocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
				break;
			case 'disconnected':
				statusDot = `<span style="color: var(--text-error);">●</span>`;
				tooltipText += `Disconnected from ${this.settings.serverProtocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
				break;
		}

		const pulseAnimation = isPulsing ? `
			<style>
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.3; }
				}
			</style>
		` : '';

		this.statusBarItemEl.innerHTML = `
			${pulseAnimation}
			<span style="display: flex; align-items: center; gap: 6px; cursor: pointer;" aria-label="${tooltipText}" data-tooltip-position="top">
				<span style="
					width: 12px;
					height: 16px;
					display: flex;
					align-items: center;
					background-image: ${logoUrl};
					background-size: contain;
					background-repeat: no-repeat;
					background-position: center;
				"></span>
				${statusDot}
			</span>
		`;

		console.log(logoUrl);
	}

	startHealthCheck(): void {
		this.connectionStatus = 'checking';
		this.updateStatusBar();

		this.testConnection();

		this.healthCheckInterval = window.setInterval(async () => {
			await this.testConnection();
		}, OpenCode.HEALTH_CHECK_INTERVAL_MS);
	}

	stopHealthCheck(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}
	}
}
