import { useState, useEffect } from "react";
import { X, Clock, CheckCircle, Play, Pause, Video, ChevronLeft, ChevronRight, FileText } from "lucide-react";

export default function ActiveWorkout({ onClose, onFinish, program, initialDayIndex = 0 }) {
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Day Management for Structured Programs
  // If program has 'days', use it. Otherwise fallback to 'exercises' (backward compatibility)
  const hasDays = program?.days && program.days.length > 0;
  const [selectedDayId, setSelectedDayId] = useState(hasDays ? program.days[initialDayIndex]?.id || program.days[0].id : null);

  // Get exercises for current view
  const currentExercises = hasDays 
    ? program.days.find(d => d.id === selectedDayId)?.exercises || []
    : program?.exercises || [];

  // If nutrition program, show content
  const isNutrition = program?.type === 'nutrition';

  const [logs, setLogs] = useState({}); 

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setTimer(t => t + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogChange = (exId, setIdx, field, value) => {
    setLogs(prev => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        [setIdx]: {
          ...prev[exId]?.[setIdx],
          [field]: value
        }
      }
    }));
  };

  const handleFinish = () => {
    const formattedLogs = {};

    // Only log exercises from the current active day to avoid confusion
    currentExercises.forEach(ex => {
      // Use instanceId if available (new structure), otherwise fallback to id (old structure)
      const uniqueId = ex.instanceId || ex.id;
      const exLogs = logs[uniqueId];
      
      if (exLogs) {
        const setList = Object.values(exLogs).map(set => ({
          weight: set.kg || 0,
          reps: set.reps || 0
        }));
        if (setList.length > 0) {
          formattedLogs[ex.name] = setList;
        }
      }
    });

    onFinish(formattedLogs, timer);
  };

  // Nutrition View
  if (isNutrition) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="bg-emerald-600 text-white p-4 flex justify-between items-center shadow-lg">
          <h2 className="font-bold text-lg">{program?.title || "Beslenme Programı"}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={28} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="text-emerald-600" /> Program Detayları
            </h3>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
              {program?.content || "İçerik bulunamadı."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="font-bold text-lg">{program?.title || "Serbest Antrenman"}</h2>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xl font-bold mt-1">
            <Clock size={20} /> {formatTime(timer)}
            <button onClick={() => setIsPaused(!isPaused)} className="text-white/80 hover:text-white">
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X size={28} />
        </button>
      </div>

      {/* Day Tabs (if multi-day) */}
      {hasDays && (
        <div className="flex overflow-x-auto bg-slate-800 text-slate-400 border-t border-slate-700">
          {program.days.map(day => (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition ${selectedDayId === day.id ? 'text-white bg-slate-700' : 'hover:text-slate-200'}`}
            >
              {day.name}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {currentExercises.length === 0 ? (
           <div className="text-center py-12 text-slate-400">
             Bu gün için hareket bulunmuyor.
           </div>
        ) : (
          currentExercises.map((ex, idx) => {
            const uniqueId = ex.instanceId || ex.id; // Support both structures
            return (
              <div key={uniqueId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                   <div>
                     <h3 className="font-bold text-slate-800 text-lg">{ex.name}</h3>
                     <p className="text-sm text-slate-500">
                       {ex.sets} Set x {ex.reps} • {ex.rest}sn Dinlenme
                       {ex.weight && ` • ${ex.weight}kg`}
                     </p>
                     {ex.notes && <p className="text-xs text-amber-600 mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded">Not: {ex.notes}</p>}
                   </div>
                   {/* Video button could be linked to ex.videoUrl if available in data */}
                   {ex.videoUrl && (
                     <button className="text-blue-600 bg-blue-50 p-2 rounded-full hover:bg-blue-100">
                       <Video size={20} />
                     </button>
                   )}
                 </div>
                 
                 <div className="p-4 space-y-3">
                   {Array.from({ length: Number(ex.sets) || 3 }).map((_, setIdx) => (
                     <div key={setIdx} className="flex items-center gap-3">
                       <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-bold">
                         {setIdx + 1}
                       </span>
                       <input 
                         type="number" 
                         placeholder="kg" 
                         className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center focus:border-emerald-500 outline-none"
                         onChange={(e) => handleLogChange(uniqueId, setIdx, 'kg', e.target.value)}
                       />
                       <input 
                         type="number" 
                         placeholder="tekrar" 
                         className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center focus:border-emerald-500 outline-none"
                         defaultValue={ex.reps?.replace ? ex.reps.replace(/\D/g,'') : ex.reps} // Auto-fill target reps if possible
                         onChange={(e) => handleLogChange(uniqueId, setIdx, 'reps', e.target.value)}
                       />
                       <button className="ml-auto text-slate-300 hover:text-emerald-500">
                         <CheckCircle size={24} />
                       </button>
                     </div>
                   ))}
                 </div>
              </div>
            );
          })
        )}
        
        {/* Ad Space */}
        <div className="bg-slate-200 p-8 rounded-xl text-center text-slate-500 border-2 border-dashed border-slate-300">
          REKLAM ALANI 1
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-slate-200">
        <button 
          onClick={handleFinish}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition"
        >
          ANTRENMANI BİTİR
        </button>
      </div>
    </div>
  );
}
