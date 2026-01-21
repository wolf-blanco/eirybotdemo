import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getLocalizedText } from "@/eirybotDemo/engine/runner";
import { maskPII } from "@/eirybotDemo/engine/masker";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

        const sessionRef = doc(db, "eirybot-site", "root", "eirybot_demo_sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const session = sessionSnap.data() as any;
        const { botInstance, lead, language } = session;

        console.log("[HandoffAPI] Session Lead Data:", JSON.stringify(lead, null, 2));
        console.log("[HandoffAPI] Bot Vars:", JSON.stringify(botInstance?.variables, null, 2));

        // Generate Summary
        let summaryText = "";
        if (botInstance.handoff?.summary_template) {
            let template = getLocalizedText(botInstance.handoff.summary_template, language);

            // Context includes both initial config (clinicName, specialty) and captured data (lead)
            // Note: 'lead' is nested in the session object usually under 'lead', but we might have flattened some?
            // Let's debug by merging them carefully.

            const context: any = {
                ...botInstance.variables, // from create-session (clinicName, specialty...)
                ...lead, // captured from chat (name, email...)
                // Explicitly map if keys differ, e.g. if 'specialty' is passed in body but stored in variables.
            };

            console.log("Handoff Context:", JSON.stringify(context, null, 2)); // Debug log

            // Replace variables
            summaryText = template.replace(/\{(\w+)\}/g, (_, key) => {
                return context[key] || "N/A";
            });
        }

        // Update Session
        await setDoc(sessionRef, {
            status: "completed",
            summaryText: maskPII(summaryText),
            handoffReady: true
        }, { merge: true });

        return NextResponse.json({ success: true, summary: summaryText });
    } catch (error) {
        console.error("Error in handoff:", error);
        return NextResponse.json({ error: "Failed handoff" }, { status: 500 });
    }
}
