import { BotTemplate, FlowStep, Session, TextOrLocalized, Language } from "./types";

export function getLocalizedText(text: TextOrLocalized | undefined, lang: Language): string {
    if (!text) return "";
    if (typeof text === "string") return text;
    return text[lang] || text["en"] || ""; // Fallback to EN or empty
}

export function findFlow(template: BotTemplate, flowId: string) {
    return template.flows.find(f => f.id === flowId);
}

export function getNextStep(
    session: Session,
    input?: string
): {
    nextFlowId?: string;
    nextStepIndex?: number;
    outputMessage?: string;
    fieldToUpdate?: { key: string; value: any };
    status?: "active" | "handoff_ready" | "completed";
} {
    const { currentFlowId, currentStepIndex, botInstance, language } = session;
    if (!currentFlowId) return { nextFlowId: "main", nextStepIndex: 0 }; // Default start

    const flow = findFlow(botInstance, currentFlowId);
    if (!flow) return { status: "completed" }; // Should not happen

    const step = flow.steps[currentStepIndex || 0];
    if (!step) return { status: "completed" };

    // Logic to determine next state based on current step type and input
    let nextFlowId = currentFlowId;
    let nextStepIndex = (currentStepIndex || 0) + 1;
    let fieldToUpdate = undefined;
    let outputMessage = undefined;
    let status = (session.status === "active" || !session.status) ? "active" : session.status; // Default active if undefined

    // Process input: Input applies to the CURRENT step we are on.
    // If the current step is 'ask' and has a variable, we capture it.

    if (step.variable && input) {
        fieldToUpdate = { key: step.variable, value: input };
    }

    // Handle conditionals (on current step)
    if (step.condition && input) {
        for (const cond of step.condition) {
            if (cond.value === input) { // exact match for demo
                // jump to flow
                return { nextFlowId: cond.next, nextStepIndex: 0, fieldToUpdate };
            }
        }
    }

    // Handle explicit next flow
    if (step.next) {
        // If it looks like a flow ID (e.g. contains underscore or is separate), keys off logic.
        // For simple demo, assume if step.next exists, it's a flow ID if it doesn't match a step ID in this flow?
        // Or just simplify: steps are sequential unless 'next' points to a specific flow.
        // Let's assume 'next' matches a flow.id first.
        if (findFlow(botInstance, step.next)) {
            return { nextFlowId: step.next, nextStepIndex: 0, fieldToUpdate };
        }
    }

    // End/Handoff
    if (step.type === "handoff") {
        // We stay on this step index or move forward? 
        // Logic: The 'event' that triggered this was likely a system_handoff event for THIS step.
        // So we should return the new status.
        return {
            nextFlowId, // Keep same flow
            nextStepIndex, // Advance index so we don't get stuck processing "handoff" step forever if logic loops
            fieldToUpdate,
            status: "handoff_ready"
        };
    }
    if (step.type === "end") {
        return {
            nextFlowId,
            nextStepIndex,
            fieldToUpdate,
            status: "completed"
        };
    }

    // Check if we ran out of steps
    if (nextStepIndex >= flow.steps.length) {
        // End of flow, verify if fallback needed? default to completed if no pointer.
        return { status: "completed", fieldToUpdate };
    }

    return { nextFlowId, nextStepIndex, fieldToUpdate, status };
}
