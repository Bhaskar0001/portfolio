/**
 * MYSTICAL TRIANGLE - STATIC SCRIPT
 * Logic ported from backend/utils/numerology.js & frontend interactivity
 */

/* ===========================
   LOGIC: NUMEROLOGY UTILS
   =========================== */

function reduceToDigit(n) {
    if (n === 0) return 0;
    let sum = Math.abs(n);
    while (sum > 9) {
        let currentString = sum.toString();
        sum = 0;
        for (let char of currentString) {
            sum += parseInt(char, 10);
        }
    }
    return sum;
}

function parseDateParts(dateStr) {
    if (!dateStr || !dateStr.includes('/')) {
        return { dd: 0, mm: 0, y1: 0, y2: 0 };
    }
    const [d, m, y] = dateStr.split('/');
    const dd = reduceToDigit(parseInt(d, 10));
    const mm = reduceToDigit(parseInt(m, 10));

    // Safety check for incomplete years
    const safeYear = y ? y : "0000";
    const paddedYear = safeYear.padEnd(4, '0');

    const y1 = reduceToDigit(parseInt(paddedYear.substring(0, 2), 10)); // Century
    const y2 = reduceToDigit(parseInt(paddedYear.substring(2, 4), 10)); // Year
    return { dd, mm, y1, y2 };
}

function calculateTriangle(dates) {
    // Ensure we process 3 items, filling missing ones with empty strings
    const safeDates = [...dates];
    while (safeDates.length < 3) safeDates.push("");

    const p1 = parseDateParts(safeDates[0]);
    const p2 = parseDateParts(safeDates[1]);
    const p3 = parseDateParts(safeDates[2]);

    // COMPUTE A, B, C, D
    const A = reduceToDigit(p1.dd + p2.dd + p3.dd);
    const B = reduceToDigit(p1.mm + p2.mm + p3.mm);
    const C = reduceToDigit(p1.y1 + p2.y1 + p3.y1);
    const D = reduceToDigit(p1.y2 + p2.y2 + p3.y2);

    // COMPUTE E..R
    const E = reduceToDigit(A + B);
    const F = reduceToDigit(C + D);
    const G = reduceToDigit(E + F);

    const I = reduceToDigit(A + E);
    const J = reduceToDigit(B + E);
    const K = reduceToDigit(C + F);
    const L = reduceToDigit(D + F);

    const H = reduceToDigit(I + J);
    const M = reduceToDigit(K + L);

    const N = reduceToDigit(F + G);
    const O = reduceToDigit(E + G);
    const P = reduceToDigit(N + O);
    const Q = reduceToDigit(O + P);
    const R = reduceToDigit(N + P);

    // Extras
    const EGN = reduceToDigit(E + G + N);
    const FGO = reduceToDigit(F + G + O);

    // Has 7 in NOQR?
    const noqr = [N, O, Q, R];
    const has7 = noqr.includes(7);

    // Counts on [E, F, G, N, O]
    const middle = [E, F, G, N, O];
    const counts = {
        group16: 0,
        group27: 0,
        group38: 0,
        group49: 0,
        group5: 0
    };

    middle.forEach(val => {
        if (val === 1 || val === 6) counts.group16++;
        else if (val === 2 || val === 7) counts.group27++;
        else if (val === 3 || val === 8) counts.group38++;
        else if (val === 4 || val === 9) counts.group49++;
        else if (val === 5) counts.group5++;
    });

    return {
        values: { A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R },
        extras: { EGN, FGO, has7 },
        counts
    };
}

/* ===========================
   LOGIC: VALIDATION
   =========================== */

function validateDates(dates) {
    if (!Array.isArray(dates)) return "Invalid input.";

    const filledDates = dates.filter(d => d && d.trim() !== "");
    if (filledDates.length === 0) return "Please provide at least one date.";

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

    // We want to return specific error for specific field index if possible, 
    // but the original function returns a string. We'll adapt validation in the UI handler.
    for (let i = 0; i < dates.length; i++) {
        const dateStr = dates[i];
        if (!dateStr || dateStr.trim() === "") continue;

        if (!dateRegex.test(dateStr)) return `Date ${i + 1} must be in DD/MM/YYYY format.`;

        const [d, m, y] = dateStr.split('/').map(Number);
        if (m < 1 || m > 12) return `Date ${i + 1} has invalid month.`;
        if (d < 1 || d > 31) return `Date ${i + 1} has invalid day.`;

        const dateObj = new Date(y, m - 1, d);
        if (dateObj.getFullYear() !== y || dateObj.getMonth() + 1 !== m || dateObj.getDate() !== d) {
            return `Date ${i + 1} is not a valid calendar date.`;
        }
    }
    return null;
}

/* ===========================
   UI INTERACTION
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
    // Authentication Check
    if (sessionStorage.getItem('authenticated') !== 'true') {
        window.location.href = 'index.html';
        return; // Stop execution
    }

    const inputs = [
        document.getElementById('date1'),
        document.getElementById('date2'),
        document.getElementById('date3')
    ];
    const errorSpans = [
        document.getElementById('error1'),
        document.getElementById('error2'),
        document.getElementById('error3')
    ];
    const globalError = document.getElementById('global-error');
    const loading = document.getElementById('loading');
    const resultsContainer = document.getElementById('results-container');
    const form = document.getElementById('triangle-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Reset UI
        globalError.textContent = '';
        globalError.style.display = 'none';
        errorSpans.forEach(span => span.textContent = '');
        inputs.forEach(input => input.classList.remove('error'));
        resultsContainer.style.display = 'none';

        // Gather Values
        const dates = inputs.map(input => input.value.trim());

        // Validate
        const validationMsg = validateDates(dates);
        if (validationMsg) {
            // Rough mapping of error to field for better UI, or just global
            globalError.textContent = validationMsg;
            globalError.style.display = 'block';

            // Highlight fields if specific error
            if (validationMsg.includes("Date 1")) { inputs[0].classList.add('error'); errorSpans[0].textContent = validationMsg; }
            else if (validationMsg.includes("Date 2")) { inputs[1].classList.add('error'); errorSpans[1].textContent = validationMsg; }
            else if (validationMsg.includes("Date 3")) { inputs[2].classList.add('error'); errorSpans[2].textContent = validationMsg; }
            return;
        }

        // Processing
        loading.style.display = 'block';

        // Simulate delay for effect (optional, feels 'computational')
        setTimeout(() => {
            try {
                const result = calculateTriangle(dates);
                renderResults(result);
                loading.style.display = 'none';
                resultsContainer.style.display = 'grid'; // matches .results-grid display type
            } catch (err) {
                console.error(err);
                loading.style.display = 'none';
                globalError.textContent = "An error occurred during calculation.";
                globalError.style.display = 'block';
            }
        }, 600);
    });

    function renderResults(data) {
        const { values, extras, counts } = data;

        // Render Values (A-R)
        for (const [key, val] of Object.entries(values)) {
            const el = document.getElementById(`val-${key}`);
            if (el) el.textContent = val;
        }

        // Render Extras
        document.getElementById('val-EGN').innerHTML = `<span>${values.E}</span><span>${values.G}</span><span>${values.N}</span>`;
        document.getElementById('val-FGO').innerHTML = `<span>${values.F}</span><span>${values.G}</span><span>${values.O}</span>`;

        // Render Counts
        document.getElementById('count-16').textContent = counts.group16;
        document.getElementById('count-27').textContent = counts.group27;
        document.getElementById('count-38').textContent = counts.group38;
        document.getElementById('count-49').textContent = counts.group49;
        document.getElementById('count-5').textContent = counts.group5;

        // Render NOQR
        document.getElementById('noqr-N').textContent = values.N;
        document.getElementById('noqr-O').textContent = values.O;
        document.getElementById('noqr-Q').textContent = values.Q;
        document.getElementById('noqr-R').textContent = values.R;

        // Has 7
        const has7El = document.getElementById('has7-status');
        const has7Text = document.getElementById('has7-text');

        if (extras.has7) {
            has7El.className = 'has7-status yes';
            has7Text.textContent = 'YES';
        } else {
            has7El.className = 'has7-status no';
            has7Text.textContent = 'NO';
        }
    }
});
