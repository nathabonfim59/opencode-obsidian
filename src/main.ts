import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, OpenCodeSettings, OpenCodeSettingTab } from "./settings";
import { getDarkLogo, getLightLogo, DARK_ICON_SVG, LIGHT_ICON_SVG } from "./utils";
import { OpenCodeView, VIEW_TYPE_OPENCODE } from "./view";
import { RequestUrlParam } from 'obsidian';
import { requestUrl } from 'obsidian';

export default class OpenCode extends Plugin {
	settings: OpenCodeSettings;
	statusBarItemEl: HTMLElement | null = null;
	ribbonIconEl: HTMLElement | null = null;
	connectionStatus: 'checking' | 'connected' | 'disconnected' = 'checking';
	healthCheckInterval: number | null = null;
	static readonly HEALTH_CHECK_INTERVAL_MS = 30000;
	static readonly CONNECTION_TIMEOUT_MS = 5000;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_OPENCODE, (leaf) => new OpenCodeView(leaf, this));
		this.addRibbonIcon('opencode', 'Opencode', () => {
			void this.activateView();
		});
		this.setupRibbonIcon();
		this.setupStatusBar();
		this.startHealthCheck();

		this.addSettingTab(new OpenCodeSettingTab(this.app, this));
	}

	setupRibbonIcon() {
		const ribbonIconEls = Array.from(document.querySelectorAll('.workspace-ribbon-action'));
		let ribbonIconEl: HTMLElement | null = null;

		for (const el of ribbonIconEls) {
			if (el.getAttribute('aria-label') === 'Opencode') {
				ribbonIconEl = el as HTMLElement;
				break;
			}
		}

		if (!ribbonIconEl) return;

		this.ribbonIconEl = ribbonIconEl;
		this.updateRibbonIcon();

		const observer = new MutationObserver(() => {
			this.updateRibbonIcon();
		});
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class']
		});
		this.register(() => observer.disconnect());
	}

	updateRibbonIcon() {
		if (!this.ribbonIconEl) return;

		const isDark = document.body.classList.contains('theme-dark');
		const svgElement = this.ribbonIconEl.querySelector('svg');
		if (svgElement) {
			svgElement.innerHTML = isDark ? DARK_ICON_SVG : LIGHT_ICON_SVG;
		}
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

			let requestParams: RequestUrlParam = {
				url: `${this.getServerUrl()}/global/health`,
				method: 'GET',
				headers,
			}

			const response = await requestUrl(requestParams);

			clearTimeout(timeoutId);

			if (response.status == 200) {
				this.connectionStatus = 'connected';
				this.updateStatusBar();
				return true;
			} else {
				this.connectionStatus = 'disconnected';
				this.updateStatusBar();
				return false;
			}
		} catch {
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

		let tooltipText = 'OpenCode - ';
		let isPulsing = false;
		let isError = false;

		switch (this.connectionStatus) {
			case 'checking':
				tooltipText += 'Checking...';
				isPulsing = true;
				isError = true;
				break;
			case 'connected':
				tooltipText += `Connected to ${this.settings.serverProtocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
				break;
			case 'disconnected':
				tooltipText += `Disconnected from ${this.settings.serverProtocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
				isError = true;
				break;
		}

		this.statusBarItemEl.empty();

		const containerEl = document.createElement('span');
		containerEl.classList.add('opencode-status-container');
		containerEl.ariaLabel = tooltipText;
		containerEl.setAttribute('data-tooltip-position', 'top');

		const logoEl = document.createElement('span');
		logoEl.classList.add('opencode-logo');
		logoEl.style.setProperty('--opencode-logo-image', logoUrl);

		const statusDotEl = document.createElement('span');
		statusDotEl.textContent = '●';
		statusDotEl.classList.add('opencode-status-dot');
		if (isError) {
			statusDotEl.classList.add('error');
		}
		if (isPulsing) {
			statusDotEl.classList.add('pulsing');
		}

		containerEl.appendChild(logoEl);
		containerEl.appendChild(statusDotEl);
		this.statusBarItemEl.appendChild(containerEl);
	}

	startHealthCheck(): void {
		this.connectionStatus = 'checking';
		this.updateStatusBar();

		void this.testConnection();

		this.healthCheckInterval = window.setInterval(() => {
			void this.testConnection();
		}, OpenCode.HEALTH_CHECK_INTERVAL_MS);
	}

	stopHealthCheck(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}
	}

	async activateView() {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_OPENCODE);
		if (leaves.length > 0 && leaves[0]) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_OPENCODE, active: true });
			void workspace.revealLeaf(leaf);
		}
	}
}
