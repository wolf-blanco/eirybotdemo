import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Session, BotEvent } from "@/eirybotDemo/engine/types";
import { getLocalizedText } from "@/eirybotDemo/engine/runner";

interface ChatPanelProps {
    sessionId: string;
    onFinish?: (sid: string) => void;
}

type Skill = 'web' | 'whatsapp' | 'instagram';

export default function ChatPanel({ sessionId, onFinish }: ChatPanelProps) {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [events, setEvents] = useState<BotEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState("");
    const [processing, setProcessing] = useState(false);

    // SKILL STATE
    const [activeSkill, setActiveSkill] = useState<Skill>('web');
    const [showToast, setShowToast] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const processedSteps = useRef(new Set<string>());

    // THEMES CONFIGURATION
    const THEMES = {
        web: {
            container: "bg-slate-50 border-slate-200 font-sans",
            header: "bg-white border-b border-slate-200",
            headerText: "text-slate-800",
            bgOverlay: "",
            userBubble: "bg-[#6200EE] text-white rounded-2xl rounded-tr-none shadow-md",
            botBubble: "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-none shadow-sm",
            inputBar: "bg-white border-t border-slate-200 pb-6 pt-2",
            inputField: "bg-slate-100 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#6200EE]/20 rounded-xl",
            sendButton: "bg-[#6200EE] hover:bg-[#5000ca] text-white rounded-xl shadow-md",
        },
        whatsapp: {
            container: "bg-[#E5DDD5] border-[#075E54]/20 font-sans",
            header: "bg-[#075E54] text-white shadow-md",
            headerText: "text-white",
            bgOverlay: "bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-10",
            userBubble: "bg-[#DCF8C6] text-slate-800 rounded-lg shadow-sm mr-2",
            botBubble: "bg-white text-slate-800 rounded-lg shadow-sm ml-2",
            inputBar: "bg-[#F0F0F0] px-2 py-2 pb-6",
            inputField: "bg-white text-slate-800 rounded-full px-4 text-sm shadow-sm",
            sendButton: "bg-[#075E54] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md",
        },
        instagram: {
            container: "bg-white border-slate-200 font-sans",
            header: "bg-white border-b border-slate-100 text-slate-900",
            headerText: "text-slate-900",
            bgOverlay: "",
            userBubble: "bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-3xl px-5 py-3",
            botBubble: "bg-slate-100 text-slate-800 rounded-3xl px-5 py-3",
            inputBar: "bg-white px-4 py-3 pb-6",
            inputField: "bg-slate-100 text-slate-800 rounded-full px-5 border border-transparent focus:border-slate-300",
            sendButton: "text-blue-500 font-semibold hover:text-blue-600 px-2",
        }
    };

    const activeTheme = THEMES[activeSkill];

    // Helpers
    const interpolate = (text: string) => {
        if (!text || !session) return text;
        const context = { ...session.botInstance.variables, ...session.lead };
        return text.replace(/\{(\w+)\}/g, (_, key) => context[key] || "");
    };

    const [isFinishing, setIsFinishing] = useState(false);

    const fetchSession = async () => {
        if (!sessionId || isFinishing) return;
        try {
            const res = await fetch(`/api/demo/session/${sessionId}`);
            const data = await res.json();
            if (data.session) {
                setSession(data.session);
                setEvents(data.events || []);

                if ((data.session.status === "handoff_ready" || data.session.status === "completed") && !isFinishing) {
                    setIsFinishing(true);

                    if (data.session.status === "handoff_ready" && !data.session.handoffSent) {
                        await completeSession(sessionId);
                    }

                    setTimeout(() => {
                        if (onFinish) onFinish(sessionId);
                    }, 3000);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const completeSession = async (sid: string) => {
        try {
            await fetch("/api/demo/handoff", {
                method: "POST",
                body: JSON.stringify({ sessionId: sid })
            });
        } catch (e) { console.error("Error completing session", e); }
    };

    useEffect(() => {
        fetchSession();
        const interval = setInterval(() => {
            if (!isFinishing) fetchSession();
        }, 3000);
        return () => clearInterval(interval);
    }, [sessionId, isFinishing]);

    // SCROLL LOGIC
    useEffect(() => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            scrollRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    }, [events, session, processing, activeSkill]);

    // MAIN EVENT LOOP
    useEffect(() => {
        if (!session || processing) return;

        const { botInstance, currentFlowId, currentStepIndex, language } = session;
        if (!currentFlowId) return;

        const flow = botInstance.flows.find(f => f.id === currentFlowId);
        if (!flow) return;
        const step = flow.steps[currentStepIndex || 0];
        if (!step) return;

        // Check if this step has already been processed in the backend events
        const stepAlreadyProcessed = events.some(e => e.stepId === step.id);
        if (stepAlreadyProcessed) {
            // If backend has it, we respect that.
            if (!processedSteps.current.has(step.id)) processedSteps.current.add(step.id);
            return;
        }

        // Local lock check
        if (processedSteps.current.has(step.id)) return;

        const STEP_DELAYS: Record<string, number> = {
            "confirm_avail": 3000,
            "handoff_step": 3500
        };
        const delay = STEP_DELAYS[step.id] || 800;

        // ONLY AUTO-FIRE EVENTS FOR 'TEXT' (and handoff). 
        // DO NOT AUTO-FIRE FOR QUESTIONS ('ask', 'menu'), OR IT WILL ANSWER ITSELF.
        // We will render 'ask' questions visually below, but we wait for USER INPUT.

        if (step.type === "text") {
            processedSteps.current.add(step.id);
            setProcessing(true);
            setTimeout(() => {
                const rawText = getLocalizedText(step.text, language);
                const text = interpolate(rawText);
                postEvent("bot_message", { text }, step.id).then(() => {
                    setProcessing(false);
                    fetchSession();
                });
            }, delay);
        }
        else if (step.type === "handoff" && session.status !== "handoff_ready") {
            processedSteps.current.add(step.id);
            setTimeout(() => {
                postEvent("system_handoff", {}, step.id).then(() => {
                    setProcessing(false);
                    fetchSession();
                });
            }, delay);
        }

    }, [session, events]);

    const postEvent = async (type: string, payload: any, stepId?: string) => {
        if (!sessionId || !session) return;
        try {
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
        } catch (e) {
            console.error("Failed to post event", e);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText("");
        setProcessing(true); // UI Lock
        await postEvent("user_message", { text });
        // We do NOT add to processedSteps here, the *next* step will be handled by the loop
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
                payload: { text: value },
                flowId: session?.currentFlowId
            })
        });
        await fetchSession();
        setProcessing(false);
    };

    const changeSkill = (newSkill: Skill) => {
        setActiveSkill(newSkill);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const currentStep = (() => {
        if (!session) return null;
        const flow = session.botInstance.flows.find(f => f.id === session.currentFlowId);
        return flow?.steps[session.currentStepIndex || 0];
    })();

    // Helper to determine if we should show a visual bubble for the current pending question
    const pendingQuestion = currentStep && ["ask", "ask_choice", "menu", "ask_optional"].includes(currentStep.type) ? currentStep : null;

    if (loading && !session) return (
        <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-500 rounded-2xl min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <span className="text-xs font-medium tracking-wide uppercase">Cargando...</span>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-full w-full ${activeTheme.container} rounded-2xl overflow-hidden shadow-xl relative transition-colors duration-500`}>

            {activeTheme.bgOverlay && (
                <div className={`absolute inset-0 ${activeTheme.bgOverlay} z-0 pointer-events-none`}></div>
            )}

            {isFinishing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in text-center p-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 relative">
                        <svg className="w-8 h-8 text-purple-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <div className="absolute inset-0 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">Generando Reporte</h2>
                    <p className="text-sm text-slate-500">Analizando métricas de la sesión...</p>
                </div>
            )}

            {showToast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white px-4 py-2 rounded-full text-xs font-medium z-50 animate-fade-in-down shadow-lg backdrop-blur-sm">
                    Vista cambiada a {activeSkill === 'web' ? 'Web Widget' : activeSkill === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </div>
            )}

            <div className={`${activeTheme.header} px-4 py-3 flex items-center justify-between z-20 shrink-0 shadow-sm relative`}>
                <div className="flex items-center gap-3">
                    {activeSkill === 'whatsapp' ? (
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-white/20">
                            <img src="/mascot_eirybot.png" className="w-full h-full object-cover" alt="profile" />
                        </div>
                    ) : activeSkill === 'instagram' ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                            <div className="w-full h-full bg-white rounded-full p-[2px] overflow-hidden">
                                <img src="/mascot_eirybot.png" className="w-full h-full object-cover" alt="profile" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-purple-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                    )}

                    <div>
                        <h1 className={`font-bold ${activeTheme.headerText} text-sm leading-tight`}>
                            {activeSkill === 'instagram' ? 'eirybot_official' : 'Asistente EiryBot'}
                        </h1>
                        <div className="flex items-center gap-1.5 opacity-90">
                            {activeSkill !== 'instagram' && (
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSkill === 'whatsapp' ? 'bg-white' : 'bg-green-500'} animate-pulse`}></span>
                            )}
                            <span className={`text-[10px] ${activeSkill === 'whatsapp' ? 'text-white/80' : 'text-slate-500'} font-medium`}>
                                {activeSkill === 'whatsapp' ? 'en línea' : activeSkill === 'instagram' ? 'Active now' : 'En línea 24/7'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`hidden sm:block text-[10px] font-bold uppercase tracking-wider ${activeSkill === 'whatsapp' ? 'text-white/70' : 'text-slate-400'}`}>
                        Cambiar Vista:
                    </span>
                    <div className="flex bg-black/5 p-1 rounded-lg gap-1">
                        <button
                            onClick={() => changeSkill('web')}
                            title="Web Widget"
                            className={`p-1.5 rounded-md transition-all ${activeSkill === 'web' ? 'bg-white shadow text-purple-600' : 'text-black/40 hover:bg-black/5'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        </button>
                        <button
                            onClick={() => changeSkill('whatsapp')}
                            title="WhatsApp"
                            className={`p-1.5 rounded-md transition-all ${activeSkill === 'whatsapp' ? 'bg-white shadow text-green-600' : 'text-black/40 hover:bg-black/5'}`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </button>
                        <button
                            onClick={() => changeSkill('instagram')}
                            title="Instagram"
                            className={`p-1.5 rounded-md transition-all ${activeSkill === 'instagram' ? 'bg-white shadow text-pink-600' : 'text-black/40 hover:bg-black/5'}`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth relative z-10 custom-scrollbar`}>

                {activeSkill !== 'web' && (
                    <div className="flex justify-center mb-6">
                        <span className="text-[10px] bg-black/10 text-slate-500 px-2 py-1 rounded-lg uppercase font-semibold tracking-wide">
                            Hoy
                        </span>
                    </div>
                )}

                {/* HISTORICAL EVENTS */}
                {events.map((ev, i) => {
                    if (ev.type === "system" || ev.type === "system_handoff" || !ev.payload || !(ev.payload as any).text) return null;
                    const isUser = ev.type === "user_message";

                    return (
                        <div key={ev.eventId || i} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up group`}>
                            {!isUser && activeSkill === 'instagram' && (
                                <div className="w-6 h-6 rounded-full overflow-hidden mr-2 self-end mb-1">
                                    <img src="/mascot_eirybot.png" className="w-full h-full object-cover" alt="bot" />
                                </div>
                            )}

                            <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                                <div className={`
                                    px-4 py-2.5 text-sm leading-relaxed relative
                                    ${isUser ? activeTheme.userBubble : activeTheme.botBubble}
                                `}>
                                    <span className="whitespace-pre-wrap block">{interpolate((ev.payload as any)?.text || "")}</span>
                                </div>

                                {activeSkill === 'web' && (
                                    <span className="text-[10px] text-slate-400 mt-1 px-1 opacity-70">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                {activeSkill === 'whatsapp' && (
                                    <div className={`text-[9px] mt-0.5 px-0.5 ${isUser ? "text-right opacity-70" : "text-left opacity-60"}`}>
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isUser && <span className="ml-1 text-blue-400">✓✓</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* TRANSIENT BUBBLE FOR CURRENT QUESTION (Visual Only) */}
                {pendingQuestion && (
                    <div className={`flex w-full justify-start animate-fade-in-up group`}>
                        {activeSkill === 'instagram' && (
                            <div className="w-6 h-6 rounded-full overflow-hidden mr-2 self-end mb-1">
                                <img src="/mascot_eirybot.png" className="w-full h-full object-cover" alt="bot" />
                            </div>
                        )}
                        <div className={`max-w-[85%] sm:max-w-[75%] items-start flex flex-col`}>
                            <div className={`px-4 py-2.5 text-sm leading-relaxed relative ${activeTheme.botBubble}`}>
                                <span className="whitespace-pre-wrap block">
                                    {interpolate(getLocalizedText(pendingQuestion.text, session?.language || "es"))}
                                </span>
                            </div>
                            {activeSkill === 'web' && (
                                <span className="text-[10px] text-slate-400 mt-1 px-1 opacity-70">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* TYPING INDICATOR */}
                {processing && !pendingQuestion && (
                    <div className={`flex w-full justify-start animate-fade-in ${activeSkill === 'whatsapp' ? 'ml-2' : ''}`}>
                        {!activeSkill && activeSkill === 'instagram' && <div className="w-6 h-6 mr-2"></div>}
                        <div className={`px-4 py-3 ${activeTheme.botBubble} flex gap-1.5 items-center w-auto`}>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`${activeTheme.inputBar} shrink-0 z-20`}>
                <div className="w-full space-y-3">

                    {currentStep && !processing && activeSkill === 'instagram' && (currentStep.type === "ask_choice" || currentStep.type === "menu") && (
                        <div className="animate-fade-in pl-1">
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {currentStep.options?.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleOption(opt.value, getLocalizedText(opt.label, session?.language || "es"))}
                                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border border-slate-200"
                                    >
                                        {getLocalizedText(opt.label, session?.language || "es")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!currentStep || processing ? (
                        <div className="h-10 flex items-center justify-center">
                            <span className="text-xs text-slate-400 italic">
                                {activeSkill === 'whatsapp' ? 'EiryBot está escribiendo...' : 'Escribiendo...'}
                            </span>
                        </div>
                    ) : (
                        <>
                            {activeSkill !== 'instagram' && (currentStep.type === "ask_choice" || currentStep.type === "menu") && (
                                <div className="flex flex-wrap gap-2 animate-fade-in mb-2">
                                    {currentStep.options?.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleOption(opt.value, getLocalizedText(opt.label, session?.language || "es"))}
                                            className={`
                                                px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm
                                                ${activeSkill === 'web'
                                                    ? "bg-white border border-purple-100 text-purple-700 hover:bg-purple-50 hover:shadow"
                                                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                                                }
                                            `}
                                        >
                                            {getLocalizedText(opt.label, session?.language || "es")}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {(currentStep.type === "ask" || currentStep.type === "ask_optional") && (
                                <div className="flex gap-2 items-center">
                                    <button className="text-slate-400 hover:text-slate-600 p-1">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    </button>

                                    <input
                                        className={`flex-1 ${activeTheme.inputField} py-2.5 outline-none`}
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                        placeholder={activeSkill === 'instagram' ? 'Message...' : "Escribe tu respuesta..."}
                                        autoFocus
                                        disabled={processing}
                                    />

                                    {inputText.trim() ? (
                                        <button
                                            onClick={handleSend}
                                            disabled={processing}
                                            className={`${activeTheme.sendButton} transition-all disabled:opacity-50`}
                                        >
                                            {activeSkill === 'instagram' ? 'Send' : (
                                                <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            )}
                                        </button>
                                    ) : (
                                        <button className="text-slate-400 p-1">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {activeSkill === 'whatsapp' && (
                <div className="bg-[#f0f0f0] border-t border-[#d1d7db] px-4 py-1.5 flex justify-center">
                    <button className="text-[10px] text-[#00a884] font-medium hover:underline flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
}