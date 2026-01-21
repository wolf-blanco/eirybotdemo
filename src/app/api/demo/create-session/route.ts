import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { mergeTemplates } from "@/eirybotDemo/engine/merge";
import { Session } from "@/eirybotDemo/engine/types";
import { maskObject } from "@/eirybotDemo/engine/masker";

// Import templates
import baseTemplate from "@/eirybotDemo/templates/base.json";

// Specialties
import dentalTemplate from "@/eirybotDemo/templates/specialties/dental.json";
import realEstateTemplate from "@/eirybotDemo/templates/specialties/real_estate.json";
import legalTemplate from "@/eirybotDemo/templates/specialties/legal.json";
import ecommerceTemplate from "@/eirybotDemo/templates/specialties/ecommerce.json";
import educationTemplate from "@/eirybotDemo/templates/specialties/education.json";

// Goals (Generic & Specific)
import appointmentsTemplate from "@/eirybotDemo/templates/goals/appointments.json";
import faqsTemplate from "@/eirybotDemo/templates/goals/faqs.json";
import insuranceTemplate from "@/eirybotDemo/templates/goals/insurance_check.json";
import intakeTemplate from "@/eirybotDemo/templates/goals/new_patient_intake.json";
import orthoTemplate from "@/eirybotDemo/templates/goals/orthodontics_consult.json";
import instructionsTemplate from "@/eirybotDemo/templates/goals/post_visit_instructions.json";
import promotionsTemplate from "@/eirybotDemo/templates/goals/promotions.json";

import faqsRealEstateTemplate from "@/eirybotDemo/templates/goals/faqs_real_estate.json";

// Goal mapping helper
const getGoalTemplate = (goal: string, specialty?: string) => {
    // Special Overrides based on Specialty
    if (goal === "faqs" && specialty === "real_estate") {
        return faqsRealEstateTemplate;
    }

    switch (goal) {
        // Generic
        case "appointments": return appointmentsTemplate;
        case "faqs": return faqsTemplate;
        case "promotions": return promotionsTemplate;

        // Dental/Medical Specifics
        case "insurance_check": return insuranceTemplate;
        case "new_patient_intake": return intakeTemplate;
        case "orthodontics_consult": return orthoTemplate;
        case "post_visit_instructions": return instructionsTemplate;

        default: return appointmentsTemplate;
    }
};

const getSpecialtyTemplate = (specialty: string) => {
    switch (specialty) {
        case "dental": return dentalTemplate;
        case "real_estate": return realEstateTemplate;
        case "legal": return legalTemplate;
        case "ecommerce": return ecommerceTemplate;
        case "education": return educationTemplate;
        default: return null;
    }
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { specialty, goal, language, ...demographics } = body;

        // 1. Select templates
        const templates = [baseTemplate as any];

        // Add Specialty Layer
        const specialtyTmpl = getSpecialtyTemplate(specialty);
        if (specialtyTmpl) {
            templates.push(specialtyTmpl);
        } else if (specialty === "dental") {
            templates.push(dentalTemplate);
        }

        // Add Goal Layer
        const goalTmpl = getGoalTemplate(goal, specialty);
        if (goalTmpl) {
            templates.push(goalTmpl);
        }

        // 2. Merge
        const botInstance = mergeTemplates(templates);

        // 3. Dynamic Router Patch
        const goalFlowId = `flow_${goal}`;

        const goalFlowMap: Record<string, string> = {
            "appointments": "flow_appointments",
            "faqs": "flow_faqs",
            "insurance_check": "flow_insurance",
            "new_patient_intake": "flow_patient_intake",
            "orthodontics_consult": "flow_ortho",
            "post_visit_instructions": "flow_instructions",
            "promotions": "flow_promotions"
        };

        let targetFlow = goalFlowMap[goal] || "flow_appointments";

        // Override target flow for Real Estate FAQs
        if (specialty === "real_estate" && goal === "faqs") {
            targetFlow = "flow_faqs_re";
        }

        // Find main flow
        const mainFlow = botInstance.flows.find(f => f.id === "main");
        const routerStep = mainFlow?.steps.find(s => s.id === "goal_router");
        if (routerStep && (routerStep.type === 'text' || routerStep.type === 'ask')) {
            // Only update if it points to generic placeholder or standard flow
            routerStep.next = targetFlow;
        }

        // 4. Inject variables
        botInstance.variables = {
            ...botInstance.variables,
            ...demographics,
            specialty,
            goal
        };

        // 5. Create Session Object
        const sessionId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const safeDemographics = JSON.parse(JSON.stringify(maskObject(demographics)));

        const session: Session = {
            sessionId,
            language: language || "es",
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            lead: safeDemographics,
            botInstance,
            status: "active",
            currentFlowId: "main",
            currentStepIndex: 0
        };

        console.log(`[API] Creating session ${sessionId}. Specialty: ${specialty}, Goal: ${goal}`);
        await setDoc(doc(db, "eirybot-site", "root", "eirybot_demo_sessions", sessionId), session);

        return NextResponse.json({ sessionId });
    } catch (error: any) {
        console.error("Error creating session:", error);
        return NextResponse.json({
            error: "Failed to create session",
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}
