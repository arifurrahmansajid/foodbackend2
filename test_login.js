async function testLogin() {
    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'supperadmin@gmail.com',
                password: 'supper123'
            })
        });
        const data = await res.json();
        console.log('STATUS:', res.status);
        console.log('DATA:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('FETCH FAILED:', error.message);
    }
}

testLogin();
