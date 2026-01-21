// Native fetch is available in Node 18+

async function testE2E() {
    console.log("Starting E2E Test...");
    const baseUrl = "http://localhost:3005";

    // 1. Test Create Session
    console.log("1. Testing POST /api/demo/create-session...");
    try {
        const res = await fetch(`${baseUrl}/api/demo/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clinicName: 'Test Clinic',
                specialty: 'dental',
                goal: 'appointments',
                language: 'es',
                receptionEmail: 'test@example.com'
            })
        });

        console.log("Status:", res.status);
        if (!res.ok) {
            console.error("Failed:", await res.text());
            process.exit(1);
        }

        const data = await res.json();
        console.log("Response data:", data);

        if (!data.sessionId) {
            console.error("No sessionId received!");
            process.exit(1);
        }

        console.log("✅ Create Session Passed. SessionID:", data.sessionId);

        // 2. Test Get Session
        console.log("\n2. Testing GET /api/demo/session/" + data.sessionId);
        const resSession = await fetch(`${baseUrl}/api/demo/session/${data.sessionId}`);
        const sessionData = await resSession.json();
        if (sessionData.session && sessionData.session.sessionId === data.sessionId) {
            console.log("✅ Get Session Passed.");
        } else {
            console.error("❌ Get Session Failed:", sessionData);
        }

    } catch (e) {
        console.error("Test Exception:", e);
        process.exit(1);
    }
}

testE2E();
