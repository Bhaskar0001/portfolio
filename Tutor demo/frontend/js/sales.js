/**
 * Sales Dashboard Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Protect route
    const user = auth.checkAuth('sales');
    if (!user) return;
  
    // 2. Set user details
    document.getElementById('user-name').innerText = user.name;
    document.getElementById('user-email').innerText = user.email;
    document.getElementById('user-initials').innerText = user.name.charAt(0).toUpperCase();
  
    // 3. Initialize UI elements
    const availableSlotsBody = document.getElementById('available-slots-body');
    const filterDate = document.getElementById('filter-date');
    const searchTutor = document.getElementById('search-tutor');
    const logoutBtn = document.getElementById('logout-btn');
    const bookingModal = document.getElementById('booking-modal');
    const closeModal = document.getElementById('close-modal');
    const bookingForm = document.getElementById('booking-form');
    const modalSlotInfo = document.getElementById('modal-slot-info');
    const bookingsBody = document.getElementById('bookings-body');
    const navItems = document.querySelectorAll('.nav-item');
    const browseSection = document.getElementById('browse-section');
    const historySection = document.getElementById('history-section');
  
    let selectedSlotId = null;
    let allAvailableSlots = [];
  
    // 4. Load initial data
    loadAvailableSlots();
    loadBookingHistory();

    // Polling for live updates (Phase 6)
    const pollingIndicator = document.getElementById('polling-status');
    const pollingInterval = setInterval(async () => {
        // Only poll if the modal is not open to avoid UI shifts while user is typing
        if (bookingModal.style.display !== 'flex') {
            if (pollingIndicator) pollingIndicator.classList.add('syncing');
            await loadAvailableSlots();
            setTimeout(() => {
                if (pollingIndicator) pollingIndicator.classList.remove('syncing');
            }, 1000);
        }
    }, 30000); 

    // Cleanup interval on page unload
    window.addEventListener('unload', () => clearInterval(pollingInterval));

    // Navigation logic
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (item.classList.contains('logout-btn')) return;
        
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        if (item.innerText.includes('Browse')) {
          browseSection.classList.remove('hidden');
          historySection.classList.add('hidden');
        } else if (item.innerText.includes('History')) {
          browseSection.classList.add('hidden');
          historySection.classList.remove('hidden');
          loadBookingHistory();
        }
      });
    });
  
    // 5. Handle Filtering
    const applyFilters = () => {
      const dateVal = filterDate.value;
      const searchVal = searchTutor.value.toLowerCase();
  
      const filtered = allAvailableSlots.filter(slot => {
        const matchesDate = !dateVal || slot.date === dateVal;
        const matchesTutor = !searchVal || slot.tutorId.name.toLowerCase().includes(searchVal);
        return matchesDate && matchesTutor;
      });
  
      renderSlots(filtered);
    };
  
    filterDate.addEventListener('change', applyFilters);
    searchTutor.addEventListener('input', applyFilters);
  
    // 6. Handle Booking (UI only for Phase 4)
    availableSlotsBody.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-book')) {
        selectedSlotId = e.target.dataset.id;
        const slot = allAvailableSlots.find(s => s._id === selectedSlotId);
        
        modalSlotInfo.innerHTML = `
          <strong>Date:</strong> ${formatDate(slot.date)}<br>
          <strong>Time:</strong> ${slot.startTime} - ${slot.endTime}<br>
          <strong>Tutor:</strong> ${slot.tutorId.name}
        `;
        bookingModal.style.display = 'flex';
      }
    });
  
    closeModal.addEventListener('click', () => {
      bookingModal.style.display = 'none';
      bookingForm.reset();
    });
  
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const clientName = document.getElementById('client-name').value;
      const clientPhone = document.getElementById('client-phone').value;

      try {
        const confirmBtn = document.getElementById('confirm-booking-btn');
        confirmBtn.disabled = true;
        confirmBtn.innerText = 'Booking...';

        const res = await auth.apiFetch('/api/bookings/create', {
          method: 'POST',
          body: JSON.stringify({ 
            slotId: selectedSlotId, 
            clientName, 
            clientPhone 
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Booking failed');

        bookingModal.style.display = 'none';
        bookingForm.reset();
        auth.showToast('Demo booked successfully!', 'success');
        
        loadAvailableSlots(); // Refresh slot list
        if (typeof loadBookingHistory === 'function') loadBookingHistory();
      } catch (err) {
        auth.showToast(err.message, 'error');
      } finally {
        const confirmBtn = document.getElementById('confirm-booking-btn');
        confirmBtn.disabled = false;
        confirmBtn.innerText = 'Confirm Booking';
      }
    });
  
    // 7. Handle Logout
    logoutBtn.addEventListener('click', () => {
      auth.logout();
    });
  
    /**
     * Fetch all available slots
     */
    async function loadAvailableSlots() {
      try {
        const res = await auth.apiFetch('/api/slots/list');
        const data = await res.json();
  
        if (!res.ok) throw new Error(data.message || 'Failed to fetch slots');
  
        allAvailableSlots = data.slots;
        renderSlots(allAvailableSlots);
      } catch (err) {
        availableSlotsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--error);">${err.message}</td></tr>`;
      }
    }
  
    /**
     * Render slots to table
     */
    function renderSlots(slots) {
      if (slots.length === 0) {
        availableSlotsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No available slots found.</td></tr>';
        return;
      }
  
      availableSlotsBody.innerHTML = slots.map(slot => {
        const isBooked = slot.status === 'booked';
        let actionContent = '';
        
        if (isBooked) {
          const bookedByTxt = slot.bookingInfo && slot.bookingInfo.bookedBy === 'tutor' ? 'Tutor' : 
                              (slot.bookingInfo && slot.bookingInfo.salesName ? slot.bookingInfo.salesName : 'Another Rep');
          actionContent = `<span style="color: var(--error); font-size: 0.875rem;">Booked by ${bookedByTxt}</span>`;
        } else {
          actionContent = `
            <button class="btn-book" data-id="${slot._id}">
              Book Demo
            </button>
          `;
        }

        return `
          <tr ${isBooked ? 'style="opacity: 0.7;"' : ''}>
            <td style="font-weight: 600;">${slot.tutorId.name}</td>
            <td>${formatDate(slot.date)}</td>
            <td>${slot.startTime} - ${slot.endTime}</td>
            <td>${actionContent}</td>
          </tr>
        `;
      }).join('');
    }
  
    /**
     * Fetch booking history
     */
    async function loadBookingHistory() {
      try {
        const res = await auth.apiFetch('/api/bookings/list');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderHistory(data.bookings);
      } catch (err) {
        console.error(err);
      }
    }

    /**
     * Render history to table
     */
    function renderHistory(bookings) {
      if (!bookingsBody) return;
      if (bookings.length === 0) {
        bookingsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No bookings yet.</td></tr>';
        return;
      }

      bookingsBody.innerHTML = bookings.map(b => `
        <tr>
          <td style="font-weight: 600;">${b.tutorId.name}</td>
          <td>${formatDate(b.slotId.date)}</td>
          <td>${b.slotId.startTime}</td>
          <td>${b.clientName}</td>
        </tr>
      `).join('');
    }

    /**
     * Helper: Format Date
     */
    function formatDate(dateStr) {
      const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    }
  });
