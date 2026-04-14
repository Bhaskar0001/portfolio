/**
 * Auth Utility Module
 */
const auth = {
  /**
   * Register a new user
   */
  async register(userData) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    
    this.saveSession(data.token, data.user);
    return data;
  },

  /**
   * Login existing user
   */
  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    this.saveSession(data.token, data.user);
    return data;
  },

  /**
   * Save session to localStorage
   */
  saveSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Get current user from storage
   */
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Get JWT token
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  },

  /**
   * Fetch wrapper with Auth header
   */
  async apiFetch(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired. Please login again.');
    }

    return res;
  },

  /**
   * Route protection check
   */
  checkAuth(allowedRole) {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || !token) {
      this.redirectToLogin();
      return null;
    }

    // Basic token expiry check (optional, but good for UX)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        this.logout();
        return null;
      }
    } catch (e) {
      this.logout();
      return null;
    }

    if (allowedRole && user.role !== allowedRole) {
      console.warn('Access Denied: Role mismatch');
      window.location.href = user.role === 'tutor' 
        ? 'tutor-dashboard.html' 
        : 'sales-dashboard.html';
      return null;
    }

    // Show body if it was hidden
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    
    return user;
  },

  redirectToLogin() {
    window.location.href = 'login.html';
  },

  /**
   * Global Toast Notification
   */
  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Initial check to prevent flash of content
if (window.location.pathname.includes('dashboard')) {
    document.write('<style>body { visibility: hidden; opacity: 0; transition: opacity 0.3s ease-in; }</style>');
}

