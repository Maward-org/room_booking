frappe.provide("room_booking.RoomBooking");

/**
 * 🪟 عارض غرف ثلاثي الأبعاد مع تفاعلات واقعية
 */
room_booking.RoomBooking.Room3DViewer = class {
    constructor() {
        this.currentRoom = null;
        this.initViewer();
    }

    initViewer() {
        this.container = $(`
            <div class="3d-room-viewer">
                <div class="viewer-header">
                    <h3 class="room-title"></h3>
                    <button class="btn-close"><i class="fa fa-times"></i></button>
                </div>
                <div class="3d-container"></div>
                <div class="room-controls">
                    <button class="btn-control" data-action="rotate"><i class="fa fa-sync-alt"></i></button>
                    <button class="btn-control" data-action="zoom-in"><i class="fa fa-search-plus"></i></button>
                    <button class="btn-control" data-action="zoom-out"><i class="fa fa-search-minus"></i></button>
                    <button class="btn-control" data-action="fullscreen"><i class="fa fa-expand"></i></button>
                </div>
            </div>
        `).hide();
        
        $('body').append(this.container);
        this.bindEvents();
    }

    loadRoom(roomData) {
        this.currentRoom = roomData;
        this.container.find('.room-title').text(roomData.name);
        
        // محاكاة تحميل نموذج 3D (يمكن استبدالها بمكتبة مثل Three.js)
        this.container.find('.3d-container').html(`
            <div class="3d-placeholder">
                <img src="${roomData.image || '/assets/room_booking/images/3d_placeholder.jpg'}" 
                     alt="${roomData.name}">
                <div class="hotspots">
                    ${roomData.equipment.map(item => `
                        <div class="hotspot" style="top:${item.y}%;left:${item.x}%" 
                             data-tooltip="${item.name}">
                            <i class="fa ${item.icon || 'fa-info-circle'}"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);

        this.show();
    }

    show() {
        this.container.fadeIn();
        $('body').addClass('no-scroll');
    }

    hide() {
        this.container.fadeOut();
        $('body').removeClass('no-scroll');
    }

    bindEvents() {
        // إغلاق العارض
        this.container.find('.btn-close').click(() => this.hide());

        // التحكم في المشهد
        this.container.on('click', '.btn-control', (e) => {
            const action = $(e.currentTarget).data('action');
            this.handleControlAction(action);
        });

        // التفاعل مع النقاط الساخنة
        this.container.on('mouseenter', '.hotspot', function() {
            $(this).append(`<div class="tooltip">${$(this).data('tooltip')}</div>`);
        }).on('mouseleave', '.hotspot', function() {
            $(this).find('.tooltip').remove();
        });
    }

    handleControlAction(action) {
        const placeholder = this.container.find('.3d-placeholder');
        
        switch(action) {
            case 'rotate':
                placeholder.toggleClass('rotate');
                break;
            case 'zoom-in':
                placeholder.css('transform', (i, val) => {
                    const scale = parseFloat(val.replace('scale(', '')) || 1;
                    return `scale(${scale + 0.1})`;
                });
                break;
            case 'zoom-out':
                placeholder.css('transform', (i, val) => {
                    const scale = parseFloat(val.replace('scale(', '')) || 1;
                    return `scale(${Math.max(0.5, scale - 0.1)})`;
                });
                break;
            case 'fullscreen':
                this.container.toggleClass('fullscreen');
                break;
        }
    }
};