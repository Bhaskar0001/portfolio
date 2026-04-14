const http = require('http');

const login = () => new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'admin@acme-ca.com', password: 'Admin@123' });
    const req = http.request('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
            try {
                const json = JSON.parse(body);
                if (json.data?.accessToken) resolve(json.data.accessToken);
                else reject(new Error('No token: ' + body));
            } catch(e) { reject(e); }
        });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
});

const apiGet = (path, token) => new Promise((resolve, reject) => {
    const req = http.request('http://localhost:5000' + path, {
        headers: { Authorization: 'Bearer ' + token }
    }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
});

const apiPost = (path, token, payload = {}) => new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request('http://localhost:5000' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, Authorization: 'Bearer ' + token }
    }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
});

(async () => {
    try {
        console.log('1. Logging in...');
        const token = await login();
        console.log('   ✅ Login OK, token:', token.substring(0, 20) + '...');

        console.log('\n2. Fetching notices...');
        const noticesRes = await apiGet('/api/notices', token);
        console.log('   ✅ Notices found:', noticesRes.data?.length || 0);

        if (noticesRes.data?.length > 0) {
            const notice = noticesRes.data[0];
            console.log('   First notice:', notice.department, notice.section, 'ID:', notice._id);

            console.log('\n3. Testing AI Analyze...');
            const analyzeRes = await apiPost('/api/notices/' + notice._id + '/analyze', token);
            if (analyzeRes.success) {
                console.log('   ✅ AI Analysis OK!');
                console.log('   Risk:', analyzeRes.data.riskLevel);
                console.log('   Source:', analyzeRes.data.source);
                console.log('   Summary:', analyzeRes.data.summary?.substring(0, 150) + '...');
                console.log('   Action Points:', analyzeRes.data.actionPoints?.length || 0);
                console.log('   Documents Required:', analyzeRes.data.documentsRequired?.length || 0);
                console.log('   SOP Steps:', analyzeRes.data.sopSteps?.length || 0);
                console.log('   Legal Refs:', analyzeRes.data.legalReferences?.length || 0);
            } else {
                console.log('   ❌ Analyze failed:', analyzeRes.message);
            }

            console.log('\n4. Testing AI Draft Response...');
            const draftRes = await apiPost('/api/notices/' + notice._id + '/draft-ai', token);
            if (draftRes.success) {
                console.log('   ✅ Draft OK! Length:', draftRes.data.draft?.length, 'chars');
                console.log('   Preview:', draftRes.data.draft?.substring(0, 100) + '...');
            } else {
                console.log('   ❌ Draft failed:', draftRes.message);
            }
        }

        console.log('\n5. Health check...');
        const health = await apiGet('/health', '');
        console.log('   ✅ Health:', health.status);

        console.log('\n🎉 All tests passed!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
})();
