import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc } from "firebase/firestore";

// Helper to convert Firestore Timestamps to logic-friendly dates/strings
const normalizeFirestoreData = (data: any) => {
    if (!data) return data;
    const res: any = { ...data };

    // Convert Timestamps to ISO strings
    if (res.createdAt && typeof res.createdAt.toDate === 'function') {
        res.createdAt = res.createdAt.toDate().toISOString();
    }
    if (res.expiresAt && typeof res.expiresAt.toDate === 'function') {
        res.expiresAt = res.expiresAt.toDate().toISOString();
    }
    if (res.ts && typeof res.ts.toDate === 'function') {
        res.ts = res.ts.toDate().toISOString();
    }

    return res;
};

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
    try {
        const { sessionId } = await params;

        if (!sessionId) {
            return NextResponse.json({ error: "Missing Session ID" }, { status: 400 });
        }

        // 1. Get Session
        const sessionRef = doc(db, "eirybot-site", "root", "eirybot_demo_sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const session = normalizeFirestoreData(sessionSnap.data());

        // 2. Get Events
        // Query: eirybot-site/root/eirybot_demo_events where sessionId == ... order by ts
        const eventsRef = collection(db, "eirybot-site", "root", "eirybot_demo_events");
        const q = query(eventsRef, where("sessionId", "==", sessionId), orderBy("ts", "asc"));
        const querySnapshot = await getDocs(q);

        const events = querySnapshot.docs.map(d => normalizeFirestoreData(d.data()));

        return NextResponse.json({ session, events });
    } catch (error: any) {
        console.error("Error fetching session:", error);
        return NextResponse.json({
            error: "Failed to fetch session",
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
    try {
        const { sessionId } = await params;
        const body = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: "Missing Session ID" }, { status: 400 });
        }

        const sessionRef = doc(db, "eirybot-site", "root", "eirybot_demo_sessions", sessionId);

        // Only allow updating specific fields for safety
        const updates: any = {};
        if (body.language) updates.language = body.language;

        if (Object.keys(updates).length > 0) {
            await updateDoc(sessionRef, updates);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating session:", error);
        return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
    }
}
