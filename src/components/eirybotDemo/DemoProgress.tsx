"use client";

interface DemoProgressProps {
    currentStep: 1 | 2 | 3; // 1: Config, 2: Demo/Chat, 3: Result
}

export default function DemoProgress({ currentStep }: DemoProgressProps) {
    const steps = [
        { id: 1, label: "Configuración" },
        { id: 2, label: "Demo Interactiva" },
        { id: 3, label: "Resultados" },
    ];

    return (
        <div className="w-full max-w-2xl mx-auto mb-8 px-4">
            <div className="relative flex items-center justify-between">

                {/* Connecting Line background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full -z-10"></div>

                {/* Active Line Progress */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full -z-10 transition-all duration-700 ease-in-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 group">

                            {/* Circle Indicator */}
                            <div
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-[3px] transition-all duration-500 relative z-10
                                    ${isActive
                                        ? "bg-white border-purple-600 text-purple-600 scale-110 shadow-lg shadow-purple-500/20"
                                        : isCompleted
                                            ? "bg-purple-600 border-purple-600 text-white"
                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <svg className="w-4 h-4 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    step.id
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={`
                                    text-[10px] uppercase tracking-wider font-bold transition-colors duration-300 absolute -bottom-6 w-24 text-center
                                    ${isActive ? "text-purple-700" : isCompleted ? "text-purple-900/60" : "text-slate-400"}
                                `}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Narrative Context Text (Dynamic based on step) */}
            <div className="text-center mt-10 animate-fade-in">
                {currentStep === 1 && (
                    <p className="text-sm text-slate-500 font-medium">
                        Paso 1: <span className="text-slate-800">Define el objetivo</span> de tu asistente virtual.
                    </p>
                )}
                {currentStep === 2 && (
                    <p className="text-sm text-slate-500 font-medium">
                        Paso 2: <span className="text-slate-800">Interactúa en tiempo real</span> como si fueras un paciente.
                    </p>
                )}
                {currentStep === 3 && (
                    <p className="text-sm text-slate-500 font-medium">
                        Paso 3: Revisa el <span className="text-slate-800">resumen y datos capturados</span> por el bot.
                    </p>
                )}
            </div>
        </div>
    );
}
