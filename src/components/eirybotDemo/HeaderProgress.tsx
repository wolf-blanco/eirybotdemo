"use client";

interface HeaderProgressProps {
    currentStep: 1 | 2 | 3; // 1: Config, 2: Demo/Chat, 3: Result
}

export default function HeaderProgress({ currentStep }: HeaderProgressProps) {
    const steps = [
        { id: 1, label: "Configuración" },
        { id: 2, label: "Demo" },
        { id: 3, label: "Resultados" },
    ];

    return (
        <div className="hidden md:flex items-center gap-1 md:gap-4">
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isLast = index === steps.length - 1;

                return (
                    <div key={step.id} className="flex items-center">
                        {/* Step Item */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${isActive ? "bg-white/10 border border-white/20 backdrop-blur-sm shadow-sm" : "opacity-60"}`}>
                            {/* Circle */}
                            <div className={`
                                w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors
                                ${isActive ? "bg-white text-purple-700 border-white" :
                                    isCompleted ? "bg-green-400 border-green-400 text-white" : "bg-transparent border-white/40 text-white/60"}
                            `}>
                                {isCompleted ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    step.id
                                )}
                            </div>

                            {/* Label */}
                            <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-white/80"}`}>
                                {step.label}
                            </span>
                        </div>

                        {/* Connector Line */}
                        {!isLast && (
                            <div className="w-6 h-px bg-white/20 mx-1 md:mx-2"></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
