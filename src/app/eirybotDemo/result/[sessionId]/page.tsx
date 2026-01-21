"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Session, BotEvent } from "@/eirybotDemo/engine/types";
import HeaderProgress from "@/components/eirybotDemo/HeaderProgress";

export default function ResultPage() {
    const { sessionId } = useParams();
    const router = useRouter();

    const [session, setSession] = useState<Session | null>(null);
    const [events, setEvents] = useState<BotEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    const [copied, setCopied] = useState("");

    useEffect(() => {
        if (!sessionId) return;
        fetch(`/api/demo/session/${sessionId}`)
            .then(res => res.json())
            .then(data => {
                if (data.session) {
                    setSession(data.session);
                    setEvents(data.events || []);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [sessionId]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(""), 2000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
        </div>
    );

    if (!session) return <div className="p-10 text-center">Sesión no encontrada.</div>;

    const leadData = session.lead || {};
    const variables = session.botInstance.variables || {};

    // --- METRICS & LOGIC ---
    const hasPhone = !!(leadData.phone || leadData.celular);
    const hasName = !!leadData.name;
    const isCompleted = session.status === "completed" || session.status === "handoff_ready";

    // Rigorous Score Logic
    let leadScore = 45; // Base interest
    if (hasName) leadScore += 10;
    if (hasPhone) leadScore += 35; // Critical contact info
    if (isCompleted) leadScore += 10;
    if (variables.appointment_time) leadScore += 5; // Specific intent

    // Time Saved calculation (approx 45s per interaction vs 5s reading result)
    const interactionCount = events.filter(e => e.type === "user_message").length;
    const manualTimeSeconds = interactionCount * 45;
    const aiTimeSeconds = 5; // Instant
    const savedTime = Math.ceil(manualTimeSeconds / 60);

    // Intent Level
    const intentLevel = hasPhone ? "Alto" : hasName ? "Medio" : "Bajo";

    // Narrative Logic
    const generateNarrative = () => {
        const name = leadData.name || "El usuario";
        let action = "consultó información general";
        if (session.currentFlowId === "appointments") action = "inició el proceso de agendamiento";
        if (variables.treatment_type) action = `consultó sobre ${variables.treatment_type}`;

        let status = "La conversación finalizó correctamente.";
        if (hasPhone) status = "Se capturaron datos de contacto exitosamente para seguimiento inmediato.";
        else status = "El usuario mostró interés pero no completó todos los datos de contacto.";

        return `${name} ${action}. ${status} El asistente respondió las dudas y perfiló al cliente automáticamente.`;
    };
    const narrative = generateNarrative();

    // Key Moments Extraction
    const keyMoments = [];
    if (leadData.name) keyMoments.push({ label: "Identificación", value: leadData.name });
    if (variables.treatment_type) keyMoments.push({ label: "Interés", value: variables.treatment_type });
    if (variables.appointment_time) keyMoments.push({ label: "Preferencia", value: variables.appointment_time });
    if (hasPhone) keyMoments.push({ label: "Conversión", value: "Datos Capturados" });
    if (keyMoments.length === 0) keyMoments.push({ label: "Interacción", value: "Consultas Generales" });


    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">

            {/* HEADER */}
            <header className="bg-[#6200EE] border-b border-[#5e00e4] h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-50 shadow-md">
                <img src="/logo-eirybot.png" alt="Eirybot" className="h-8 w-auto object-contain" />
                <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider hidden sm:block">Demo Session ID: {sessionId?.slice(0, 8)}</span>
                    <button
                        onClick={() => router.push('/eirybotDemo/start')}
                        className="text-xs font-bold text-white hover:text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm border border-white/10"
                    >
                        Nueva Demo
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

                {/* 1. HERO: EXECUTIVE SNAPSHOT */}
                <section className="bg-white rounded-2xl p-8 sm:p-10 text-slate-800 shadow-xl shadow-slate-200/50 border border-slate-200 relative overflow-hidden">
                    {/* Abstract Shapes (Subtle on white) */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2.5 py-1 rounded-md bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold uppercase tracking-wider">Misión Cumplida</span>
                                <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">CRM Ready</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Executive Snapshot</h1>
                            <p className="text-slate-500 text-sm mt-2 max-w-lg">
                                Tu asistente ha completado el ciclo de conversión. Aquí tienes el análisis ejecutivo de la sesión.
                            </p>
                        </div>
                        <div className="flex gap-8 text-right md:text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <div className="text-4xl font-black text-[#6200EE]">{leadScore}<span className="text-xl text-slate-400 font-medium">/100</span></div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Lead Score</div>
                            </div>
                            <div className="h-full w-px bg-slate-200"></div>
                            <div>
                                <div className="text-4xl font-black text-green-500">{intentLevel}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Intención</div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Ribbon (Violet Cards) */}
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
                        <div className="bg-[#6200EE] text-white rounded-xl p-4 shadow-lg shadow-purple-200/50 hover:-translate-y-1 transition-transform cursor-default">
                            <div className="text-[10px] text-purple-200 uppercase font-bold mb-1.5 tracking-wide">Tiempo Ahorrado</div>
                            <div className="text-2xl font-bold">~{savedTime} mins</div>
                        </div>
                        <div className="bg-[#6200EE] text-white rounded-xl p-4 shadow-lg shadow-purple-200/50 hover:-translate-y-1 transition-transform cursor-default">
                            <div className="text-[10px] text-purple-200 uppercase font-bold mb-1.5 tracking-wide">Retención Dato</div>
                            <div className="text-2xl font-bold">100%</div>
                        </div>
                        <div className="bg-[#6200EE] text-white rounded-xl p-4 shadow-lg shadow-purple-200/50 hover:-translate-y-1 transition-transform cursor-default">
                            <div className="text-[10px] text-purple-200 uppercase font-bold mb-1.5 tracking-wide">Costo Operativo</div>
                            <div className="text-2xl font-bold text-green-300">-$0.00</div>
                        </div>
                        <div className="bg-[#6200EE] text-white rounded-xl p-4 shadow-lg shadow-purple-200/50 hover:-translate-y-1 transition-transform cursor-default">
                            <div className="text-[10px] text-purple-200 uppercase font-bold mb-1.5 tracking-wide">Status PII</div>
                            <div className="text-2xl font-bold flex items-center gap-1.5">
                                <svg className="w-5 h-5 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                Masked
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. THE CORE GRID (Balanced) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* LEFT COL: LEAD INTELLIGENCE */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                Lead Capturado
                            </h2>
                            <span className="text-xs font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded">ID: {sessionId?.slice(0, 6)}</span>
                        </div>
                        <div className="p-6 flex-1 space-y-6">
                            {/* Data Points */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Nombre</div>
                                        <div className="text-base font-semibold text-slate-900">{leadData.name || "No especificado"}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-3c-1.29 0-2.486-.252-3.483.716-1.58-1.58-3.056-2.583-4.14-2.887A14.94 14.94 0 013 5z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Teléfono</div>
                                        <div className="text-base font-semibold text-slate-900">{leadData.phone || leadData.celular || "No capturado"}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Email</div>
                                        <div className="text-base font-semibold text-slate-900">{leadData.email || "No capturado"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl grid grid-cols-2 gap-3">
                            <button
                                onClick={() => copyToClipboard(JSON.stringify(leadData, null, 2), "json")}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95"
                            >
                                {copied === "json" ? (
                                    <span className="text-green-600">¡Copiado!</span>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        Copiar JSON
                                    </>
                                )}
                            </button>
                            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700 hover:bg-green-100 transition-all active:scale-95">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                Chat WhatsApp
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COL: ANALYSIS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                Análisis del Bot
                            </h2>
                        </div>
                        <div className="p-6 flex-1 space-y-6">
                            {/* Narrative */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed italic">
                                    "{narrative}"
                                </p>
                            </div>

                            {/* Highlights */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Momentos Clave</h3>
                                <div className="flex flex-wrap gap-2">
                                    {keyMoments.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-medium text-slate-700">
                                            <span className="text-slate-400 font-normal">{item.label}:</span>
                                            <span className="font-bold text-slate-900">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Transcript */}
                        <div className="border-t border-slate-100">
                            <button
                                onClick={() => setTranscriptOpen(!transcriptOpen)}
                                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                            >
                                <span>Ver Transcripción Completa ({events.length} mensajes)</span>
                                <svg className={`w-4 h-4 transform transition-transform ${transcriptOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {transcriptOpen && (
                                <div className="px-6 pb-6 pt-0 bg-slate-50 border-t border-slate-100">
                                    <div className="max-h-60 overflow-y-auto space-y-2 mt-4 pr-2 custom-scrollbar">
                                        {events.map((ev, i) => {
                                            if (ev.type === "system" || !ev.payload?.text) return null;
                                            const isUser = ev.type === "user_message";
                                            return (
                                                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${isUser ? "bg-purple-100 text-purple-900" : "bg-white border border-slate-200 text-slate-600"}`}>
                                                        {ev.payload.text}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. BUSINESS IMPACT BANNER */}
                <section className="bg-slate-900 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 text-white relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:16px_16px]"></div>

                    <div className="relative z-10">
                        <h3 className="text-lg font-bold">Impacto en Eficiencia</h3>
                        <p className="text-slate-400 text-sm mt-1">Comparativa vs Proceso Manual</p>
                    </div>

                    <div className="relative z-10 flex items-center gap-8 md:gap-12 w-full md:w-auto justify-center md:justify-end">
                        <div className="text-center opacity-50">
                            <div className="text-2xl font-bold line-through decoration-red-500 decoration-2">~15m</div>
                            <div className="text-[10px] uppercase font-bold tracking-wider mt-1">Proceso Manual</div>
                        </div>
                        <div className="text-center transform scale-110">
                            <div className="text-3xl font-bold text-green-400">~2m</div>
                            <div className="text-[10px] uppercase font-bold tracking-wider mt-1 text-green-200">Eirybot</div>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-white/20"></div>
                        <div className="text-center hidden sm:block">
                            <div className="text-2xl font-bold text-purple-400">-80%</div>
                            <div className="text-[10px] uppercase font-bold tracking-wider mt-1">Fricción</div>
                        </div>
                    </div>
                </section>

                {/* 4. CONVERSION CTA (Bottom) */}
                <section className="text-center pt-8 pb-4">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">¿Listo para implementar esto?</h2>
                    <p className="text-slate-500 mb-8 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        Los datos de esta sesión se eliminarán en 24h por seguridad.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button className="px-8 py-3.5 bg-[#6200EE] hover:bg-[#5000DD] text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all hover:-translate-y-0.5 w-full sm:w-auto">
                            Activar Eirybot en mi Sitio
                        </button>
                        <button className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all w-full sm:w-auto">
                            Agendar Demo con Experto
                        </button>
                    </div>
                </section>

            </main>
        </div>
    );
}
