"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/eirybotDemo/ChatPanel";
import MascotCarousel from "@/components/eirybotDemo/MascotCarousel";
import HeaderProgress from "@/components/eirybotDemo/HeaderProgress";
import "@/app/globals.css";

// --- SPECIALITIES CONFIG ---
const SPECIALTIES = [
    { id: "dental", label: "Clínicas / Salud", icon: "🦷" },
    { id: "real_estate", label: "Inmobiliaria", icon: "🏠" },
    { id: "legal", label: "Servicios Legales", icon: "⚖️" },
    { id: "ecommerce", label: "E-commerce", icon: "🛍️" },
    { id: "education", label: "Educación", icon: "🎓" }
];

const GOALS_BY_SPECIALTY: Record<string, { id: string; label: string; desc: string; }[]> = {
    dental: [
        { id: "appointments", label: "Agendar Citas", desc: "Automatiza la reserva de horas." },
        { id: "new_patient_intake", label: "Nuevos Pacientes", desc: "Triaje y registro inicial." },
        { id: "promotions", label: "Promociones", desc: "Ofrece descuentos y captura leads." },
        { id: "faqs", label: "Preguntas Frecuentes", desc: "Respuestas 24/7 sobre precios/ubicación." },
    ],
    real_estate: [
        { id: "appointments", label: "Agendar Visita", desc: "Coordina visitas a propiedades." },
        { id: "faqs", label: "Consultas Generales", desc: "Información sobre arriendos/ventas." },
    ],
    legal: [
        { id: "appointments", label: "Agenda Consulta", desc: "Reserva reunión con un abogado." },
        { id: "faqs", label: "Dudas Legales", desc: "Filtra casos antes de atender." },
    ],
    ecommerce: [
        { id: "faqs", label: "Soporte Pedidos", desc: "Ayuda con envíos y devoluciones." },
        { id: "promotions", label: "Ofertas Flash", desc: "Empuja productos en oferta." },
    ],
    education: [
        { id: "faqs", label: "Info Cursos", desc: "Detalles sobre programas y becas." },
        { id: "appointments", label: "Entrevista", desc: "Cita con asesor de admisiones." },
    ]
};

const INSIGHTS = [
    "Muchas organizaciones dejan pasar oportunidades comerciales y una gran cantidad de clientes por no potenciar la atención inmediata. Hoy puede superar esta barrera con Eirybot.",
    "El 63% de los clientes potenciales espera una respuesta en los primeros 5 minutos. Eirybot reduce ese tiempo de espera a 0 segundos, garantizando retención.",
    "Capturar leads calificados fuera del horario laboral aumenta las oportunidades de cierre en un 40%. Su negocio nunca más dormirá.",
    "La automatización de preguntas frecuentes libera hasta 15 horas semanales de su equipo humano, permitiéndoles enfocarse en cerrar ventas complejas.",
    "La personalización basada en datos e IA incrementa la tasa de conversión y fidelización del cliente en un 25% desde la primera interacción."
];

export default function StartPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Insight Rotation State
    const [currentInsight, setCurrentInsight] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentInsight((prev) => (prev + 1) % INSIGHTS.length);
        }, 8000); // 8 seconds per insight for readability
        return () => clearInterval(interval);
    }, []);

    // Config Form State
    const [formData, setFormData] = useState({
        specialty: "dental",
        goal: "appointments",
        businessName: "",
        language: "es",
        acceptConsent: false
    });

    const currentGoals = GOALS_BY_SPECIALTY[formData.specialty] || GOALS_BY_SPECIALTY['dental'];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'specialty') {
            setFormData(prev => ({
                ...prev,
                specialty: value,
                goal: GOALS_BY_SPECIALTY[value]?.[0]?.id || 'appointments'
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        setError(null);
    };

    const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, acceptConsent: e.target.checked }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.acceptConsent) return;

        setLoading(true);
        try {
            const res = await fetch("/api/demo/create-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.sessionId) {
                setActiveSessionId(data.sessionId);
            } else {
                throw new Error("No sessionId returned");
            }
        } catch (err: any) {
            console.error(err);
            setError("Error al iniciar sesión. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleChatFinish = (sid: string) => {
        router.push(`/eirybotDemo/result/${sid}`);
    };

    const handleEditConfig = () => {
        if (confirm("¿Estás seguro? Se perderá la sesión actual.")) {
            setActiveSessionId(null);
            setError(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-purple-100 selection:text-purple-900 pb-12">

            {/* BRANDED HEADER */}
            <header className="bg-[#6200EE] border-b border-[#5e00e4] h-20 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <img src="/logo-eirybot.png" alt="Eirybot" className="h-10 w-auto object-contain" />
                </div>
                <HeaderProgress currentStep={activeSessionId ? 2 : 1} />
                <div className="w-10"></div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 relative z-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

                    {/* LEFT COLUMN */}
                    <div className={`lg:col-span-4 xl:col-span-4 space-y-4 ${activeSessionId ? "hidden lg:block" : ""}`}>

                        {activeSessionId ? (
                            <>
                                {/* CARD 1: SESSION MONITOR */}
                                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Entorno Activo</h2>
                                            <h3 className="text-base font-bold text-slate-900 leading-tight">{formData.businessName || "Tu Negocio"}</h3>
                                            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                                                {SPECIALTIES.find(s => s.id === formData.specialty)?.label}
                                            </span>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl border border-slate-100 shadow-sm">
                                            {SPECIALTIES.find(s => s.id === formData.specialty)?.icon}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        Live Session Running
                                    </div>
                                </div>

                                {/* CARD 2: MISSION CONTROL */}
                                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Misión del Agente</h2>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-blue-100">1</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{currentGoals.find(g => g.id === formData.goal)?.label}</p>
                                                <p className="text-xs text-slate-500 leading-snug mt-0.5">{currentGoals.find(g => g.id === formData.goal)?.desc}</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-slate-100"></div>
                                        <div className="flex items-start gap-3 opacity-60">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-[10px] font-bold border border-slate-100">2</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">Calificación de Lead</p>
                                                <p className="text-xs text-slate-500 leading-snug mt-0.5">Captura y validación de datos.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                                        <button onClick={handleEditConfig} className="text-xs font-semibold text-slate-500 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 py-2 rounded-lg transition-colors">
                                            Editar Env
                                        </button>
                                        <button onClick={() => { if (confirm("¿Reiniciar todo?")) window.location.reload(); }} className="text-xs font-semibold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 py-2 rounded-lg transition-colors">
                                            Reiniciar
                                        </button>
                                    </div>
                                </div>

                                {/* CARD 3: LIVE INSIGHTS (ROTATING) */}
                                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group min-h-[160px] flex flex-col justify-center transition-all duration-500 hover:shadow-xl hover:scale-[1.02]">
                                    {/* Animated Background */}
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                                                <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Eirybot Intelligence</span>
                                        </div>

                                        <div className="relative h-24">
                                            {INSIGHTS.map((text, idx) => (
                                                <p
                                                    key={idx}
                                                    className={`absolute top-0 left-0 text-sm font-medium leading-relaxed transition-all duration-700 ease-in-out ${idx === currentInsight
                                                        ? "opacity-100 translate-y-0"
                                                        : "opacity-0 translate-y-4 pointer-events-none"
                                                        }`}
                                                >
                                                    "{text}"
                                                </p>
                                            ))}
                                        </div>

                                        {/* Progress Bar for rotation */}
                                        <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full rounded-full overflow-hidden mt-4">
                                            <div key={currentInsight} className="h-full bg-indigo-400 animate-progress origin-left w-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // "CARD PRO" FORM VIEW (Classic Aesthetic for Setup)
                            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-fade-in-up h-full flex flex-col">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-1">Configura tu Asistente</h2>
                                    <p className="text-sm text-slate-500">Personaliza la experiencia de tus usuarios.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Specialty Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Industria / Rubro</label>
                                        <div className="relative">
                                            <select
                                                name="specialty"
                                                value={formData.specialty}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-8 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                            >
                                                {SPECIALTIES.map(s => (
                                                    <option key={s.id} value={s.id}>{s.icon}  {s.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Business Name */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Negocio</label>
                                        <input
                                            type="text"
                                            name="businessName"
                                            value={formData.businessName}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
                                            placeholder="Ej. Clínica Dental Elite"
                                            required
                                        />
                                    </div>

                                    {/* Goal Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Objetivo Principal</label>
                                        <div className="relative">
                                            <select
                                                name="goal"
                                                value={formData.goal}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-8 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                            >
                                                {currentGoals.map(g => (
                                                    <option key={g.id} value={g.id}>{g.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2 ml-1">
                                            {currentGoals.find(g => g.id === formData.goal)?.desc}
                                        </p>
                                    </div>

                                    {/* Language */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Idioma</label>
                                            <select
                                                name="language"
                                                value={formData.language}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none"
                                            >
                                                <option value="es">Español 🇪🇸</option>
                                                <option value="en">English 🇺🇸</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.acceptConsent}
                                                onChange={handleCheckbox}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-purple-600 checked:bg-purple-600 hover:border-purple-400"
                                            />
                                            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </div>
                                        <div className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                                            <span className="font-medium">Acepto iniciar demo</span>
                                            <p className="text-xs text-slate-400 mt-0.5">Datos temporales de prueba.</p>
                                        </div>
                                    </label>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-2 animate-shake">
                                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={!formData.acceptConsent || loading}
                                    className={`w-full py-3.5 text-base font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-95
                                        ${!formData.acceptConsent || loading
                                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                            : "bg-[#6200EE] hover:bg-[#5000DD] text-white hover:-translate-y-0.5"
                                        }
                                    `}
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <>Iniciar Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Preview or ACTIVE CHAT */}
                    {activeSessionId ? (
                        <div className="lg:col-span-8 xl:col-span-8 h-[calc(100vh-140px)] min-h-[600px] sticky top-24 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 animate-slide-up">
                            <ChatPanel
                                sessionId={activeSessionId}
                                onFinish={handleChatFinish}
                            />
                            <div className="lg:hidden mt-6 text-center pb-8">
                                <button onClick={handleEditConfig} className="text-slate-400 text-sm font-medium hover:text-[#6200EE] transition-colors underline decoration-slate-300 underline-offset-4">Cancelar y Volver</button>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden lg:block lg:col-span-8 xl:col-span-8 sticky top-24">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden min-h-[500px] flex flex-col justify-center items-center text-center p-12 group transition-all hover:shadow-2xl hover:border-purple-100 h-full">
                                {/* Subtle Grid Background */}
                                <div className="absolute inset-0 bg-[url('/bg-pattern-dark.png')] opacity-[0.03] z-0"></div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/10 transition-all duration-1000"></div>

                                <div className="relative z-10 max-w-lg mx-auto space-y-8">
                                    <div className="transform transition-transform duration-500 group-hover:scale-105">
                                        <MascotCarousel />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">
                                            ¡Hola! Soy <span className="text-[#6200EE]">EiryBot</span>
                                        </h3>
                                        <p className="text-slate-500 text-lg leading-relaxed">
                                            Asistente inteligente para <strong>{SPECIALTIES.find(s => s.id === formData.specialty)?.label}</strong>.
                                            <br className="hidden sm:block" />
                                            Configúrame y empecemos a trabajar.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3 pt-6 opacity-80 group-hover:opacity-100 transition-opacity max-w-sm mx-auto">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> IA Avanzada
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> 24/7
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Omnicanal
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Leads Calificados
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
