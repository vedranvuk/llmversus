// Vibe Theme Manager
// Handles theme toggling, icon updates, localStorage, and initialization
class VibeThemeManager {
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
window.VibeThemeManager = VibeThemeManager;

// User Menu Manager
// Handles user menu toggle, outside click handling, and menu link clicks
class UserMenuManager {
	constructor({ triggerId, dropdownId, arrowId }) {
		this.triggerId = triggerId;
		this.dropdownId = dropdownId;
		this.arrowId = arrowId;
		this._setupEvents();
	}

	_setupEvents() {
		document.addEventListener('DOMContentLoaded', () => this.init());
		if (window.up) {
			up.on('up:fragment:inserted', () => this.init());
		}
	}

	init() {
		this.trigger = document.getElementById(this.triggerId);
		this.dropdown = document.getElementById(this.dropdownId);
		this.arrow = document.getElementById(this.arrowId);
		if (this.trigger && this.dropdown) {
			this.trigger.removeEventListener('click', this._toggleHandler);
			this._toggleHandler = this.toggleUserMenu.bind(this);
			this.trigger.addEventListener('click', this._toggleHandler);

			document.removeEventListener('click', this._outsideHandler);
			this._outsideHandler = this.handleOutsideClick.bind(this);
			document.addEventListener('click', this._outsideHandler);

			this.dropdown.removeEventListener('click', this._menuHandler);
			this._menuHandler = this.handleMenuLinkClick.bind(this);
			this.dropdown.addEventListener('click', this._menuHandler);
		}
	}

	toggleUserMenu() {
		if (!this.trigger || !this.dropdown || !this.arrow) return;
		const isHidden = this.dropdown.classList.contains('hidden');
		if (isHidden) {
			this.dropdown.classList.remove('hidden');
			this.arrow.textContent = 'arrow_drop_up';
			this.trigger.setAttribute('aria-expanded', 'true');
			const currentContent = this.dropdown.innerHTML.trim();
			const needsContent = currentContent === '' || currentContent.includes('<!-- User menu fragment will be loaded here by Unpoly -->');
			if (needsContent) {
				fetch('/user_menu')
					.then(response => response.text())
					.then(html => { this.dropdown.innerHTML = html; })
					.catch(error => { console.error('Failed to load user menu:', error); });
			}
		} else {
			this.dropdown.classList.add('hidden');
			this.arrow.textContent = 'arrow_drop_down';
			this.trigger.setAttribute('aria-expanded', 'false');
		}
	}

	handleOutsideClick(event) {
		if (this.trigger && this.dropdown && !this.trigger.contains(event.target) && !this.dropdown.contains(event.target)) {
			if (!this.dropdown.classList.contains('hidden')) {
				this.toggleUserMenu();
			}
		}
	}

	handleMenuLinkClick(event) {
		const clickedElement = event.target.closest('a');
		if (clickedElement) {
			if (this.dropdown && !this.dropdown.classList.contains('hidden')) {
				this.toggleUserMenu();
			}
		}
	}
}
window.UserMenuManager = UserMenuManager;
