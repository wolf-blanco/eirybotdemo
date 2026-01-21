export type Language = "es" | "en";

export interface LocalizedString {
    es: string;
    en: string;
}

export type TextOrLocalized = string | LocalizedString;

export interface FlowStep {
    id: string;
    type: "text" | "ask" | "ask_choice" | "ask_optional" | "menu" | "handoff" | "end";
    text?: TextOrLocalized;
    options?: { value: string; label: TextOrLocalized }[]; // For menu/ask_choice
    next?: string; // ID of next flow or step
    variable?: string; // Variable to store answer in
    condition?: {
        variable: string;
        value: string;
        next: string;
    }[];
}

export interface Flow {
    id: string;
    steps: FlowStep[];
}

export interface BotTemplate {
    flows: Flow[];
    global_intents?: Record<string, string>; // e.g. "help": "flow_help"
    variables?: Record<string, any>;
    handoff?: {
        summary_template: TextOrLocalized;
    };
}

export interface Session {
    sessionId: string;
    language: Language;
    createdAt: any; // Firestore Timestamp
    expiresAt: any; // Firestore Timestamp
    lead: Record<string, any>; // Masked lead data
    botInstance: BotTemplate;
    status: "active" | "handoff_ready" | "completed";
    currentFlowId?: string;
    currentStepIndex?: number;
    summaryText?: string;
    handoffReady?: boolean;
}

export interface BotEvent {
    eventId: string; // crypto.randomUUID()
    sessionId: string;
    ts: any; // Firestore Timestamp
    type: "user_message" | "bot_message" | "system" | "system_handoff";
    flowId?: string;
    stepId?: string;
    payload: {
        text?: string; // MASKED
        data?: any;
    };
}
