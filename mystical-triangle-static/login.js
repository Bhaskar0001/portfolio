document.addEventListener('DOMContentLoaded', () => {
    // Clear any existing session on login page load
    sessionStorage.removeItem('authenticated');

    const loginForm = document.getElementById('login-form');
    const mobileInput = document.getElementById('mobile');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('login-error');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const mobile = mobileInput.value.trim();
        const password = passwordInput.value.trim();

        if (mobile === '9911500291' && password === 'AsB@9112') {
            // Success
            sessionStorage.setItem('authenticated', 'true');
            window.location.href = 'app.html';
        } else {
            // Error
            errorMsg.textContent = 'You are not allowed to enter';
            errorMsg.style.display = 'block';

            // Shake animation effect for error
            loginForm.classList.add('shake');
            setTimeout(() => {
                loginForm.classList.remove('shake');
            }, 500);
        }
    });

    // Remove error when typing
    [mobileInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => {
            errorMsg.style.display = 'none';
        });
    });
});
