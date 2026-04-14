/**
 * Custom Vanilla JS Calendar Component
 */
class TutorCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.slots = [];
        this.bookings = [];

        // Elements
        this.grid = document.getElementById('calendar-grid');
        this.monthYearLabel = document.getElementById('calendar-month-year');
        this.prevBtn = document.getElementById('prev-month');
        this.nextBtn = document.getElementById('next-month');
        this.detailPanel = document.getElementById('day-detail-panel');
        this.detailTitle = document.getElementById('selected-date-title');
        this.daySlotsBody = document.getElementById('day-slots-body');

        this.init();
    }

    async init() {
        this.prevBtn.addEventListener('click', () => this.changeMonth(-1));
        this.nextBtn.addEventListener('click', () => this.changeMonth(1));
        await this.loadData();
        this.render();
    }

    async loadData() {
        try {
            // Fetch all slots and bookings for the tutor
            // For a more optimized version, we could filter by month on the backend
            const [slotsRes, bookingsRes] = await Promise.all([
                auth.apiFetch('/api/slots/tutor'),
                auth.apiFetch('/api/bookings/list')
            ]);

            const slotsData = await slotsRes.json();
            const bookingsData = await bookingsRes.json();

            this.slots = slotsData.slots || [];
            this.bookings = bookingsData.bookings || [];
        } catch (err) {
            console.error('Calendar Load Error:', err);
        }
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.render();
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update label
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.currentDate);
        this.monthYearLabel.innerText = `${monthName} ${year}`;

        // Clear grid
        this.grid.innerHTML = '';

        // Add day labels
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const label = document.createElement('div');
            label.className = 'calendar-day-label';
            label.innerText = day;
            this.grid.appendChild(label);
        });

        // Get first day of month and last day
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // Previous month filler
        const prevMonthLastDate = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            const cell = this.createDayCell(prevMonthLastDate - i, true);
            this.grid.appendChild(cell);
        }

        // Current month cells
        const today = new Date();
        for (let d = 1; d <= lastDate; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const cell = this.createDayCell(d, false, isToday, dateStr);
            this.grid.appendChild(cell);
        }

        // Auto-select today if not already selected
        if (!this.selectedDate) {
            // Optional: this.showDayDetails(new Date().toISOString().split('T')[0]);
        }
    }

    createDayCell(day, isOtherMonth, isToday = false, dateStr = null) {
        const cell = document.createElement('div');
        cell.className = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
        
        const number = document.createElement('span');
        number.className = 'day-number';
        number.innerText = day;
        cell.appendChild(number);

        if (!isOtherMonth && dateStr) {
            const daySlots = this.slots.filter(s => s.date === dateStr);
            if (daySlots.length > 0) {
                const indicators = document.createElement('div');
                indicators.className = 'slot-indicators';
                
                daySlots.forEach(slot => {
                    const ind = document.createElement('div');
                    ind.className = `indicator indicator-${slot.status}`;
                    indicators.appendChild(ind);
                });
                cell.appendChild(indicators);
            }

            cell.addEventListener('click', () => {
                // Highlight selected cell
                document.querySelectorAll('.calendar-day').forEach(c => c.style.borderColor = '');
                cell.style.borderColor = 'var(--primary)';
                this.showDayDetails(dateStr);
            });
        }

        return cell;
    }

    showDayDetails(dateStr) {
        this.selectedDate = dateStr;
        const daySlots = this.slots.filter(s => s.date === dateStr);
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = new Date(dateStr).toLocaleDateString('en-US', options);
        
        this.detailTitle.innerText = formattedDate;
        this.detailPanel.classList.add('active');

        if (daySlots.length === 0) {
            this.daySlotsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-dim);">No slots for this day.</td></tr>';
            return;
        }

        this.daySlotsBody.innerHTML = daySlots.map(slot => {
            const booking = this.bookings.find(b => b.slotId._id === slot._id || b.slotId === slot._id);
            const statusContent = slot.status === 'booked' && booking 
                ? `<span style="color: var(--error);">Booked by ${booking.clientName}</span>`
                : `<span style="color: var(--success);">Available</span>`;

            return `
                <tr>
                    <td>${slot.startTime} - ${slot.endTime}</td>
                    <td>${statusContent}</td>
                </tr>
            `;
        }).join('');
    }

    async refresh() {
        await this.loadData();
        this.render();
        if (this.selectedDate) {
            this.showDayDetails(this.selectedDate);
        }
    }
}

// Export for use in tutor.js
window.TutorCalendar = TutorCalendar;
