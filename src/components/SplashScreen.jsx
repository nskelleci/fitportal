import { Dumbbell, Loader2 } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="bg-emerald-600 p-4 rounded-2xl mb-6 shadow-xl animate-bounce-subtle">
         <Dumbbell size={48} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-emerald-400 mb-2 animate-pulse">FitPortal</h1>
      <p className="text-slate-400 text-sm flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Sistem Başlatılıyor...
      </p>
    </div>
  );
}

