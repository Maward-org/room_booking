frappe.provide("room_booking.RoomBooking");

/**
 * 🎤 نظام تحكم صوتي ذكي بالأوامر الصوتية
 */
room_booking.RoomBooking.VoiceController = class {
    constructor(app) {
        this.app = app;
        this.commands = {
            'احجز غرفة': () => this.app.switchView('room_selection'),
            'عرض الحجوزات': () => this.app.switchView('booking_management'),
            'بحث عن غرفة': (query) => this.searchRooms(query),
            'تحديث الصفحة': () => location.reload(),
            'مساعدة': () => this.showHelp()
        };
        
        this.init();
    }

    init() {
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.lang = 'ar-SA';
        this.recognition.interimResults = false;
        
        this.setupUI();
        this.bindEvents();
    }

    setupUI() {
        this.container = $(`
            <div class="voice-controller">
                <button class="btn-voice-command">
                    <i class="fa fa-microphone"></i>
                </button>
                <div class="voice-status">
                    <span class="listening-status">${__('انقر للتحدث')}</span>
                    <div class="voice-wave">
                        <span class="wave-dot"></span>
                        <span class="wave-dot"></span>
                        <span class="wave-dot"></span>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(this.container);
    }

    bindEvents() {
        this.container.on('click', '.btn-voice-command', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.processCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error("Voice recognition error:", event.error);
            this.showStatus(__('حدث خطأ في التعرف على الصوت'), 'error');
        };
    }

    startListening() {
        this.recognition.start();
        this.isListening = true;
        this.showStatus(__('يستمع الآن...'), 'listening');
        this.container.find('.btn-voice-command').addClass('active');
    }

    stopListening() {
        this.recognition.stop();
        this.isListening = false;
        this.showStatus(__('انقر للتحدث'), 'idle');
        this.container.find('.btn-voice-command').removeClass('active');
    }

    processCommand(transcript) {
        this.showStatus(__('يعالج الأمر...'), 'processing');
        
        let commandMatched = false;
        for (const [cmd, action] of Object.entries(this.commands)) {
            if (transcript.includes(cmd)) {
                const query = transcript.replace(cmd, '').trim();
                action(query);
                commandMatched = true;
                break;
            }
        }
        
        if (!commandMatched) {
            this.showStatus(__('لم أفهم الأمر'), 'error');
            frappe.msgprint(__('لم أتعرف على الأمر الصوتي، حاول مرة أخرى'));
        } else {
            this.showStatus(__('تم التنفيذ'), 'success');
        }
        
        setTimeout(() => this.stopListening(), 2000);
    }

    showStatus(message, status) {
        this.container.find('.listening-status').text(message);
        this.container.removeClass('idle listening processing error success');
        this.container.addClass(status);
    }

    searchRooms(query) {
        // تنفيذ البحث حسب الاستعلام الصوتي
        frappe.show_alert(__(`جاري البحث عن: ${query}`));
        this.app.roomExplorer.applySearchFilter(query);
    }

    showHelp() {
        const commandsList = Object.keys(this.commands).join('<br>');
        frappe.msgprint({
            title: __('الأوامر الصوتية المتاحة'),
            message: commandsList
        });
    }
};