"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BotTemplate, Session, FlowStep, BotEvent } from "@/eirybotDemo/engine/types";
import { getLocalizedText } from "@/eirybotDemo/engine/runner";

import { Suspense } from "react";

function ChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get("sessionId");

    const [session, setSession] = useState<Session | null>(null);
    const [events, setEvents] = useState<BotEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState("");
    const [processing, setProcessing] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);

    // Helper: Interpolate variables in text
    const interpolate = (text: string) => {
        if (!text || !session) return text;
        const context = { ...session.botInstance.variables, ...session.lead };
        return text.replace(/\{(\w+)\}/g, (_, key) => context[key] || "");
    };

    // Fetch Session Loop
    const fetchSession = async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`/api/demo/session/${sessionId}`);
            const data = await res.json();
            if (data.session) {
                setSession(data.session);
                setEvents(data.events || []);

                // Check completion
                if (data.session.status === "handoff_ready" || data.session.status === "completed") {
                    console.log("Session status:", data.session.status, "HandoffSent:", data.session.handoffSent);

                    if (!data.session.handoffSent && data.session.status === "handoff_ready") {
                        console.log("Triggering completion...");
                        completeSession(sessionId).catch(console.error);
                    } else if (data.session.handoffSent || data.session.status === "completed") {
                        console.log("Redirecting to result...");
                        router.push(`/eirybotDemo/result/${sessionId}`);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const completeSession = async (sid: string) => {
        await fetch("/api/demo/handoff", {
            method: "POST",
            body: JSON.stringify({ sessionId: sid })
        });
        router.push(`/eirybotDemo/result/${sid}`);
    };

    useEffect(() => {
        fetchSession();
        // Poll every 3s just in case, but mostly rely on local state updates after actions
        const interval = setInterval(fetchSession, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [events, session]);

    // Execute Current Step Logic
    useEffect(() => {
        if (!session || processing) return;

        const { botInstance, currentFlowId, currentStepIndex, language } = session;
        if (!currentFlowId) return;

        const flow = botInstance.flows.find(f => f.id === currentFlowId);
        if (!flow) return;
        const step = flow.steps[currentStepIndex || 0];
        if (!step) return;

        // Logic: If step is 'text', we need to display it AND tell server we saw it (bot_message)
        // Check if we already have an event for this step?
        // A simple heuristic: Is the last event's stepId == step.id?
        const lastEvent = events[events.length - 1];
        const stepAlreadyProcessed = lastEvent && lastEvent.stepId === step.id; // Removed strict 'type' check to allow system_handoff

        if (step.type === "text" && !stepAlreadyProcessed) {
            // Register bot message automatically
            setProcessing(true);
            // Simulate "Reading" time
            setTimeout(() => {
                const rawText = getLocalizedText(step.text, language);
                const text = interpolate(rawText);
                postEvent("bot_message", { text }, step.id).then(() => {
                    setProcessing(false);
                    fetchSession(); // Update state to next step
                });
            }, 1000);
        }

        // For 'handoff', the runner might have already set updated status, or we catch it here?
        // Runner.ts 'handoff' type sets status=handoff_ready.
        // So fetchSession handles the redirect.

        // Detect if we are stuck on a handoff step in the UI (status might lag or step index advanced but status update hasn't propagated via api?)
        // Actually, if we are on a 'handoff' step, we shouldn't really 'render' it, we should just wait for status update.
        // But if correct status never comes, we are stuck.

        // Let's add explicit 'handoff' handling if the runner didn't catch it for some reason, OR to trigger the event.
        if (step.type === "handoff" && !stepAlreadyProcessed && session.status !== "handoff_ready") {
            // We encountered a handoff step but status isn't ready. 
            // This implies we need to 'execute' this step (send event) so the server runner updates the status.
            setProcessing(true);
            postEvent("system_handoff", {}, step.id).then(() => {
                setProcessing(false);
                fetchSession();
            });
        }

    }, [session, events]);



    const postEvent = async (type: string, payload: any, stepId?: string) => {
        if (!sessionId || !session) return;
        await fetch("/api/demo/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId,
                type,
                payload,
                flowId: session.currentFlowId,
                stepId: stepId || "user_input"
            })
        });
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText("");
        setProcessing(true);

        // Optimistic UI update could happen here
        await postEvent("user_message", { text });
        await fetchSession();
        setProcessing(false);
    };

    const handleOption = async (value: string, label: string) => {
        setProcessing(true);
        await fetch("/api/demo/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId,
                type: "user_message",
                payload: { text: value }, // Logic uses this
                flowId: session?.currentFlowId
            })
        });

        await fetchSession();
        setProcessing(false);
    };

    // Rendering
    const getCurrentStep = () => {
        if (!session) return null;
        const flow = session.botInstance.flows.find(f => f.id === session.currentFlowId);
        return flow?.steps[session.currentStepIndex || 0];
    };

    const currentStep = getCurrentStep();

    // WhatsApp-like Eirybot Theme (Dark)
    const theme = {
        bg: "bg-[#0b141a]", // WA Dark Background
        header: "bg-[#202c33]", // WA Dark Panel
        userBubble: "bg-[#7c3aed] text-white", // Eirybot Purple
        botBubble: "bg-[#202c33] text-[#e9edef]", // WA Dark Receiver
        inputBar: "bg-[#202c33]",
        inputField: "bg-[#2a3942] text-[#d1d7db]",
    };

    if (loading && !session) return (
        <div className={`flex flex-col h-screen items-center justify-center ${theme.bg} text-white`}>
            <div className="animate-pulse flex flex-col items-center gap-4">
                <img src="/logo.png" alt="Eirybot" className="w-16 h-16" />
                <span className="text-slate-500 text-sm">Cargando...</span>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-screen ${theme.bg} font-sans`}>
            {/* Header: WhatsApp Style */}
            <div className={`${theme.header} px-4 py-3 flex items-center gap-3 shadow-sm z-10`}>
                <div className="relative">
                    <img src="/logo.png" alt="Eirybot" className="w-10 h-10 rounded-full bg-white p-1 object-contain" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#202c33] rounded-full"></div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <h1 className="font-medium text-[#e9edef] text-[16px] truncate leading-tight">
                        {interpolate(session?.lead?.clinicName || session?.botInstance?.variables?.clinicName || "Asistente Virtual")}
                    </h1>
                    <span className="text-xs text-slate-400 block truncate">
                        En línea
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            {/* Optional: Add a subtle doodle background pattern here if desired, kept solid for now */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-2 scroll-smooth bg-[url('/bg-pattern-dark.png')] bg-repeat opacity-95">
                {events.map((ev, i) => {
                    // Force cast to avoid strict union check if type definition is lagging
                    if ((ev.type as string) === "system" || (ev.type as string) === "system_handoff" || !ev.payload || !(ev.payload as any).text) return null;
                    const isUser = ev.type === "user_message";

                    return (
                        <div key={ev.eventId || i} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-2 animate-fade-in-up`}>
                            <div className={`
                                relative max-w-[85%] sm:max-w-[65%] px-3 py-1.5 rounded-lg text-[14.2px] leading-[19px] shadow-sm
                                ${isUser ? `${theme.userBubble} rounded-tr-none` : `${theme.botBubble} rounded-tl-none`}
                            `}>
                                {/* Name (in Group chat style, usually optional for 1:1 but good for Bot brand) */}
                                {!isUser && (
                                    <div className="text-[12px] font-medium text-violet-400 mb-0.5 leading-tight">
                                        Eirybot
                                    </div>
                                )}

                                <span className="whitespace-pre-wrap">{interpolate((ev.payload as any)?.text || "")}</span>

                                {/* Time checkmarks (Fake for demo) */}
                                <div className={`text-[10px] flex justify-end items-center gap-1 mt-1 ${isUser ? "text-violet-200" : "text-slate-400"}`}>
                                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isUser && <span>✓✓</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {processing && (
                    <div className="flex justify-start animate-fade-in">
                        <div className={`${theme.botBubble} rounded-lg rounded-tl-none px-4 py-2 flex gap-1 items-center`}>
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input / Controls Area */}
            <div className={`${theme.inputBar} px-2 py-2 sm:px-4 sm:py-3 pb-6 sm:pb-3`}>
                <div className="max-w-4xl mx-auto w-full space-y-3">

                    {/* Active Question Display (Context) */}
                    {currentStep && (currentStep.type === "ask" || currentStep.type === "ask_choice" || currentStep.type === "ask_optional") && !processing && (
                        <div className="px-2 py-1 bg-[#0b141a]/50 rounded border-l-4 border-violet-500 mb-1">
                            <div className="text-violet-400 text-xs font-bold">Eirybot</div>
                            <div className="text-slate-300 text-xs truncate">
                                {interpolate(getLocalizedText(currentStep.text, session?.language || "es"))}
                            </div>
                        </div>
                    )}

                    {/* Interaction Zone */}
                    {!currentStep || processing ? (
                        <div className="h-10 flex items-center justify-center text-slate-500 text-sm italic">
                            ...
                        </div>
                    ) : (
                        <>
                            {/* Choice Buttons (clean chips) */}
                            {(currentStep.type === "ask_choice" || currentStep.type === "menu") && (
                                <div className="flex flex-wrap gap-2 justify-center pb-2">
                                    {currentStep.options?.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleOption(opt.value, getLocalizedText(opt.label, session?.language || "es"))}
                                            className="px-4 py-2 bg-[#2a3942] hover:bg-violet-600/20 border border-slate-700 hover:border-violet-500 text-[#e9edef] rounded-full text-sm font-medium transition-all"
                                        >
                                            {getLocalizedText(opt.label, session?.language || "es")}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Text Input Bar */}
                            {(currentStep.type === "ask" || currentStep.type === "ask_optional") && (
                                <div className="flex gap-2 items-center">
                                    <div className={`flex-1 ${theme.inputField} rounded-lg flex items-center px-4 py-2`}>
                                        <input
                                            className="bg-transparent w-full border-none outline-none text-[#d1d7db] placeholder:text-slate-500 text-[15px]"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                            placeholder="Escribe un mensaje"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputText.trim()}
                                        className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full p-3 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-700"
                                    >
                                        <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24">
                                            <path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="text-white p-10">Loading Chat...</div>}>
            <ChatContent />
        </Suspense>
    );
}
