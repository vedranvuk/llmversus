// Theme switcher
// Handles theme toggling, icon updates, localStorage, and initialization
class ThemeSwitcher {
	constructor({ lightIconId, darkIconId, toggleBtnId }) {
		this.lightIconId = lightIconId;
		this.darkIconId = darkIconId;
		this.toggleBtnId = toggleBtnId;
		this.storageKey = 'theme';
		this._setupEvents();
	}

	_setupEvents() {
		document.addEventListener('DOMContentLoaded', () => this.init());
		if (window.up) {
			up.on('up:fragment:inserted', () => this.init());
			up.on('up:layer:history', () => this.init());
		}
	}

	init() {
		this.lightIcon = document.getElementById(this.lightIconId);
		this.darkIcon = document.getElementById(this.darkIconId);
		this.toggleBtn = document.getElementById(this.toggleBtnId);
		try {
			const theme = localStorage.getItem(this.storageKey);
			if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
			this.updateThemeIcons();
		} catch (e) {}
		if (this.toggleBtn) {
			this.toggleBtn.removeEventListener('click', this._toggleHandler);
			this._toggleHandler = this.toggleTheme.bind(this);
			this.toggleBtn.addEventListener('click', this._toggleHandler);
			this.updateThemeIcons();
		}
	}

	updateThemeIcons() {
		if (this.lightIcon && this.darkIcon) {
			this.lightIcon.style.display = '';
			this.darkIcon.style.display = '';
			if (document.documentElement.classList.contains('dark')) {
				this.lightIcon.style.display = 'block';
				this.darkIcon.style.display = 'none';
			} else {
				this.darkIcon.style.display = 'block';
				this.lightIcon.style.display = 'none';
			}
		}
	}

	toggleTheme() {
		const isDark = document.documentElement.classList.toggle('dark');
		localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
		this.updateThemeIcons();
	}
}
window.ThemeSwitcher = ThemeSwitcher;

