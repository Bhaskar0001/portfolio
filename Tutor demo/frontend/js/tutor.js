/**
 * Tutor Dashboard Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Protect route
  const user = auth.checkAuth('tutor');
  if (!user) return;

  // 2. Set user details
  document.getElementById('user-name').innerText = user.name;
  document.getElementById('user-email').innerText = user.email;
  document.getElementById('user-initials').innerText = user.name.charAt(0).toUpperCase();

  // 3. Initialize UI elements
  const addSlotForm = document.getElementById('add-slot-form');
  const slotsBody = document.getElementById('slots-body');
  const logoutBtn = document.getElementById('logout-btn');
  const navDashboard = document.getElementById('nav-dashboard');
  const navCalendar = document.getElementById('nav-calendar');
  const navBookings = document.getElementById('nav-bookings');
  const availabilitySection = document.getElementById('availability-section');
  const bookingsSection = document.getElementById('bookings-section');
  const calendarSection = document.getElementById('calendar-section');
  const bookingsBody = document.getElementById('bookings-body');
  const isBookedCheckbox = document.getElementById('is-booked');
  const clientInfoFields = document.getElementById('client-info-fields');
  const manualClientName = document.getElementById('manual-client-name');
  const manualClientPhone = document.getElementById('manual-client-phone');

  // 4. Initialize Calendar (Phase 7)
  const tutorCalendar = new TutorCalendar();

  // 5. Initialize Reminders (Phase 8)
  initBrowserReminders();

  // 6. Load initial data
  loadSlots();
  loadBookings();

  // Navigation logic
  const sections = [availabilitySection, bookingsSection, calendarSection];
  const navItems = [navDashboard, navCalendar, navBookings];

  const switchTab = (activeNav, activeSection) => {
    navItems.forEach(item => item.classList.remove('active'));
    sections.forEach(sec => sec.classList.add('hidden'));
    activeNav.classList.add('active');
    activeSection.classList.remove('hidden');
  };

  navDashboard.addEventListener('click', () => switchTab(navDashboard, availabilitySection));
  navBookings.addEventListener('click', () => {
    switchTab(navBookings, bookingsSection);
    loadBookings();
  });
  navCalendar.addEventListener('click', () => {
    switchTab(navCalendar, calendarSection);
    tutorCalendar.refresh();
  });

  // Toggle client info fields
  isBookedCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      clientInfoFields.classList.remove('hidden');
      manualClientName.required = true;
    } else {
      clientInfoFields.classList.add('hidden');
      manualClientName.required = false;
    }
  });

  // 5. Handle Form Submission
  addSlotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('slot-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;

    try {
      const res = await auth.apiFetch('/api/slots/create', {
        method: 'POST',
        body: JSON.stringify({ 
          date, 
          startTime, 
          endTime,
          isBooked: isBookedCheckbox.checked,
          clientName: manualClientName.value,
          clientPhone: manualClientPhone.value
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add slot');

      auth.showToast('Slot added successfully!', 'success');
      addSlotForm.reset();
      loadSlots(); // Refresh list
      tutorCalendar.refresh(); // Refresh calendar (Phase 7)
    } catch (err) {
      auth.showToast(err.message, 'error');
    }
  });

  // 6. Handle Logout
  logoutBtn.addEventListener('click', () => {
    auth.logout();
  });

  /**
   * Fetch and render slots
   */
  async function loadSlots() {
    try {
      const res = await auth.apiFetch('/api/slots/tutor');
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to fetch slots');

      renderSlots(data.slots);
    } catch (err) {
      slotsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--error);">${err.message}</td></tr>`;
    }
  }

  /**
   * Render slots to table
   */
  function renderSlots(slots) {
    if (slots.length === 0) {
      slotsBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No slots added yet.</td></tr>';
      return;
    }

    slotsBody.innerHTML = slots.map(slot => `
      <tr>
        <td>${formatDate(slot.date)}</td>
        <td>${slot.startTime} - ${slot.endTime}</td>
        <td>
          <span class="status-badge status-${slot.status}">
            ${slot.status}
          </span>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Fetch and render bookings
   */
  async function loadBookings() {
    try {
      const res = await auth.apiFetch('/api/bookings/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      renderBookings(data.bookings);
    } catch (err) {
      console.error(err);
    }
  }

  function renderBookings(bookings) {
    if (!bookingsBody) return;
    if (bookings.length === 0) {
      bookingsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No upcoming bookings.</td></tr>';
      return;
    }

    bookingsBody.innerHTML = bookings.map(b => `
      <tr>
        <td>${formatDate(b.slotId.date)}</td>
        <td>${b.slotId.startTime}</td>
        <td style="font-weight: 600;">${b.clientName}</td>
        <td>${b.salesId ? b.salesId.name : '<span style="color: var(--primary);">Self (Tutor)</span>'}</td>
      </tr>
    `).join('');
  }

  /**
   * Helper: Format YYYY-MM-DD to readable date
   */
  function formatDate(dateStr) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  }

  /**
   * Browser Notification Reminders (Phase 8)
   */
  async function initBrowserReminders() {
    // 1. Request permission
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }

    // 2. Check for upcoming bookings immediately and then every 5 mins
    checkUpcomingBookings();
    setInterval(checkUpcomingBookings, 5 * 60 * 1000);
  }

  async function checkUpcomingBookings() {
    try {
      // Fetch latest bookings
      const res = await auth.apiFetch('/api/bookings/list');
      const data = await res.json();
      if (!res.ok) return;

      const bookings = data.bookings || [];
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

      const upcoming = bookings.filter(b => {
        const scheduled = new Date(b.scheduledTime);
        return scheduled > now && scheduled <= nextHour;
      });

      if (upcoming.length > 0) {
        showUpcomingAlert(upcoming[0]); 
        sendPushNotification(upcoming[0]);
      }
    } catch (err) {
      console.error('Reminder check failed:', err);
    }
  }

  function showUpcomingAlert(booking) {
    const banner = document.getElementById('reminder-banner');
    if (!banner) return;
    
    const time = new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    banner.innerHTML = `🔔 <strong>Upcoming Demo:</strong> with ${booking.clientName} at ${time}. <a href="#" onclick="document.getElementById('nav-bookings').click()">View Details</a>`;
    banner.classList.remove('hidden');
  }

  function sendPushNotification(booking) {
    if ("Notification" in window && Notification.permission === "granted") {
      const time = new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Use a unique ID to prevent duplicate notifications in the same session
      const notifiedKey = `notified_${booking._id}`;
      if (sessionStorage.getItem(notifiedKey)) return;

      new Notification("Upcoming Demo Session", {
        body: `You have a demo with ${booking.clientName} at ${time}`,
        icon: '/favicon.ico'
      });

      sessionStorage.setItem(notifiedKey, 'true');
    }
  }

});
