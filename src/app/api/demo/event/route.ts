import { NextResponse } from "next/server";
// Forced Refresh

import { db } from "@/lib/firebaseClient";
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { maskPII } from "@/eirybotDemo/engine/masker";
import { BotEvent } from "@/eirybotDemo/engine/types";
import { getNextStep } from "@/eirybotDemo/engine/runner";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, type, payload, flowId, stepId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
        }

        // 1. Mask Payload
        const maskedPayload = {
            ...payload,
            text: payload.text ? maskPII(payload.text) : undefined
        };

        const eventId = crypto.randomUUID();

        // Helper to remove undefined keys (Firestore dislikes them)
        const cleanObject = (obj: any) => {
            const newObj: any = {};
            Object.keys(obj).forEach(key => {
                if (obj[key] !== undefined) {
                    newObj[key] = obj[key];
                }
            });
            return newObj;
        };

        const event = cleanObject({
            eventId,
            sessionId,
            ts: serverTimestamp(),
            type,
            flowId,
            stepId, // If undefined, cleanObject removes it
            payload: cleanObject(maskedPayload)
        });

        // 2. Save Event Document
        // eirybot-site/root/eirybot_demo_events/{eventId}
        await setDoc(doc(db, "eirybot-site", "root", "eirybot_demo_events", eventId), event);

        // 3. Update Session State
        // We update state for user_message, bot_message AND system_handoff (to trigger status changes)

        if (type === "user_message" || type === "bot_message" || type === "system_handoff") {
            // Fetch current session
            const sessionRef = doc(db, "eirybot-site", "root", "eirybot_demo_sessions", sessionId);
            const sessionSnap = await getDoc(sessionRef);

            if (sessionSnap.exists()) {
                const sessionData = sessionSnap.data() as any;

                // For logic, we need raw input.
                // NOTE: 'body.payload' comes from request.json(), so it should have the text.
                const rawInput = body.payload?.text;

                console.log(`[EventRunner] Computing next step. Type: ${type}, Input: "${rawInput}"`);

                const result = getNextStep(sessionData, type === "user_message" ? rawInput : undefined);

                const updates: any = {};
                if (result.nextFlowId) updates.currentFlowId = result.nextFlowId;
                // Only update index if it changed (optimization)
                if (result.nextStepIndex !== undefined) updates.currentStepIndex = result.nextStepIndex;
                if (result.status) updates.status = result.status;

                // Only update fields if provided and it's a valid capture
                if (result.fieldToUpdate) {
                    console.log(`[EventRunner] Capturing field: ${result.fieldToUpdate.key} = ${result.fieldToUpdate.value}`);
                    updates[`lead.${result.fieldToUpdate.key}`] = maskPII(result.fieldToUpdate.value);
                }

                // Clean updates object too
                const safeUpdates = cleanObject(updates);
                console.log("[EventRunner] Applying updates:", JSON.stringify(safeUpdates));

                if (Object.keys(safeUpdates).length > 0) {
                    // Use updateDoc to correctly interpret dot notation (e.g. "lead.name") as a nested field update.
                    // setDoc with { merge: true } and a logical object { "lead.name": "val" } saves it as a field "lead.name".
                    await updateDoc(sessionRef, safeUpdates);
                }

                return NextResponse.json({ success: true, nextState: safeUpdates });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error saving event:", error);
        return NextResponse.json({
            error: "Failed to save event",
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}
