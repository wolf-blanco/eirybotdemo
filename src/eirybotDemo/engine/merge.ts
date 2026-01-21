import { BotTemplate, Flow } from "./types";

export function mergeTemplates(templates: BotTemplate[]): BotTemplate {
    const merged: BotTemplate = {
        flows: [],
        global_intents: {},
        variables: {},
        handoff: { summary_template: "" }
    };

    const flowMap = new Map<string, Flow>();

    for (const t of templates) {
        // Merge variables
        if (t.variables) {
            merged.variables = { ...merged.variables, ...t.variables };
        }
        // Merge global intents
        if (t.global_intents) {
            merged.global_intents = { ...merged.global_intents, ...t.global_intents };
        }
        // Merge handoff (last one wins)
        if (t.handoff) {
            merged.handoff = { ...merged.handoff, ...t.handoff };
        }
        // Merge flows (last one overrides flow with same id)
        if (t.flows) {
            for (const f of t.flows) {
                flowMap.set(f.id, f);
            }
        }
    }

    merged.flows = Array.from(flowMap.values());
    return merged;
}
