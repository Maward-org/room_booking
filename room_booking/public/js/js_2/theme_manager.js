frappe.provide("room_booking.RoomBooking");

/**
 * 🎨 مدير السمات المرئية مع وضع الظلام والمظهر المخصص
 */
room_booking.RoomBooking.ThemeManager = class {
    constructor({ themes, defaultTheme }) {
        this.themes = themes;
        this.currentTheme = defaultTheme;
        this.init();
    }

    init() {
        this.loadSavedTheme();
        this.applyTheme(this.currentTheme);
        this.initThemeSwitcher();
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('roomBookingTheme');
        if (savedTheme && this.themes.includes(savedTheme)) {
            this.currentTheme = savedTheme;
        }
    }

    applyTheme(theme) {
        $('body').removeClass(this.themes.map(t => `theme-${t}`).join(' '));
        $('body').addClass(`theme-${theme}`);
        localStorage.setItem('roomBookingTheme', theme);
        
        // تحديث واجهة المستخدم حسب السمة
        // this.updateUIForTheme(theme);
    }

    initThemeSwitcher() {
        this.switcher = $(`
            <div class="theme-switcher">
                <div class="theme-options">
                    ${this.themes.map(theme => `
                        <div class="theme-option ${theme === this.currentTheme ? 'active' : ''}" 
                             data-theme="${theme}">
                            <div class="theme-preview ${theme}"></div>
                            <span>${this.getThemeName(theme)}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-toggle-theme">
                    <i class="fa fa-moon"></i>
                </button>
            </div>
        `);

        $('body').append(this.switcher);
        this.bindEvents();
    }

    getThemeName(theme) {
        const names = {
            'light': __('فاتح'),
            'dark': __('داكن'),
            'corporate': __('شركات')
        };
        return names[theme] || theme;
    }

    bindEvents() {
        this.switcher.on('click', '.theme-option', (e) => {
            const theme = $(e.currentTarget).data('theme');
            this.switchTheme(theme);
        });

        this.switcher.on('click', '.btn-toggle-theme', () => {
            this.toggleDarkMode();
        });
    }

    toggleDarkMode() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.switchTheme(newTheme);
    }

    switchTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
        this.switcher.find('.theme-option').removeClass('active');
        this.switcher.find(`.theme-option[data-theme="${theme}"]`).addClass('active');
    }
};