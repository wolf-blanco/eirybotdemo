const fs = require('fs');
const path = require('path');

// 1. Load Environment Variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
    console.log("✅ Loaded .env.local");
} else {
    console.error("❌ .env.local file NOT found! basic connectivity will likely fail.");
}

// 2. Import Firebase (using require for node script)
// We need to use the modular SDK but in CJS mode it can be tricky without a bundler.
// For simplicity in this raw script, we'll assume node_modules structure supports require via direct paths 
// OR we rely on the fact that we might be in a module environment.
// Actually, eirybot-demo is type="module" in package.json? Let's check.
// If not, we might struggle with ES6 imports.
// package.json shows: "private": true, "scripts": ...
// It does NOT say "type": "module".
// So we should use dynamic import() for firebase SDKs which are ESM mostly now.

async function runCheck() {
    try {
        console.log("Initializing Firebase...");
        const { initializeApp } = await import('firebase/app');
        const { getFirestore, doc, setDoc, getDoc } = await import('firebase/firestore');

        const config = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        if (!config.apiKey) console.warn("⚠️  API Key missing from env!");
        else console.log("🔑 API Key found.");

        console.log("🌍 Project ID:", config.projectId);

        const app = initializeApp(config);
        const db = getFirestore(app);

        const testId = "debug_" + Date.now();
        console.log(`\n📝 Attempting WRITE to /eirybot-site/root/eirybot_demo_sessions/${testId}...`);

        // Try writing a simple doc
        await setDoc(doc(db, "eirybot-site", "root", "eirybot_demo_sessions", testId), {
            test: true,
            createdAt: new Date()
        });
        console.log("✅ WRITE Successful! (Rules are likely OK)");

        console.log(`\n📖 Attempting READ from /eirybot-site/root/eirybot_demo_sessions/${testId}...`);
        const snap = await getDoc(doc(db, "eirybot-site", "root", "eirybot_demo_sessions", testId));

        if (snap.exists()) {
            console.log("✅ READ Successful! Data:", snap.data());
        } else {
            console.error("❌ READ Failed: Document not found (latency or weirdness).");
        }

    } catch (e) {
        console.error("\n❌ FIREBASE CHECK FAILED:");
        console.error(e.code ? `Code: ${e.code}` : "");
        console.error(e.message);
        if (e.code === 'permission-denied') {
            console.error("\n👉 This confirms Firestore Rules are blocking the request. Please check firestore.rules.");
        }
    }
}

runCheck();
