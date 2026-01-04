import { useState, useEffect } from "react";
import { Plus, Zap, Save, FileText, Loader2, Trash2, X, Dumbbell, Database, Star, Flame, Utensils, Layout } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { generateAIContent } from "../../lib/ai";
import WorkoutBuilder from "./WorkoutBuilder";
import NutritionBuilder from "./NutritionBuilder";

export default function ProgramsTab() {
  const { currentUser, userProfile } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState("workout"); // workout, cardio, nutrition

  // AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [programTitle, setProgramTitle] = useState("");

  // Manual Builder State
  const [activeBuilder, setActiveBuilder] = useState(null); // 'workout' | 'nutrition' | null
  const [editingProgram, setEditingProgram] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, "programs"), where("trainerId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- AI Handlers ---
  const handleGenerate = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setAiResponse("");
    
    const prompt = `Bir fitness eğitmeni olarak, şu özelliklere sahip bir öğrenci için detaylı bir antrenman programı oluştur:
    
    "${aiPrompt}"
    
    Lütfen programı Gün 1, Gün 2 şeklinde ayır. Hareket isimleri, set ve tekrar sayıları net olsun. 
    Format Markdown olsun.
    Türkçe yanıt ver.`;

    const result = await generateAIContent(prompt);
    setAiResponse(result);
    setIsGenerating(false);
    if (!programTitle) {
      setProgramTitle(aiPrompt.split(' ').slice(0, 4).join(' ') + "...");
    }
  };

  const handleSaveAI = async () => {
    if (!aiResponse || !programTitle) return;
    try {
      await addDoc(collection(db, "programs"), {
        trainerId: currentUser.uid,
        trainerName: userProfile.name,
        title: programTitle,
        content: aiResponse, // String content
        type: 'workout', // AI usually generates workouts
        subType: 'ai-generated',
        createdAt: serverTimestamp()
      });
      setShowAIModal(false);
      setAiPrompt("");
      setAiResponse("");
      setProgramTitle("");
      alert("Program şablonu kaydedildi!");
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Kaydetme hatası");
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Programı silmek istiyor musunuz?")) return;
    try {
      await deleteDoc(doc(db, "programs", id));
    } catch (error) {
      console.error(error);
    }
  };

  // Filter Programs by Active Tab
  const filteredPrograms = programs.filter(p => {
    if (activeTab === 'workout') return p.type === 'workout' || p.type === 'cardio' || p.type === 'ai-generated' || p.type === 'manual'; 
    return p.type === activeTab;
  });

  if (activeBuilder === 'workout') {
    return (
      <WorkoutBuilder 
        onCancel={() => {
          setActiveBuilder(null);
          setEditingProgram(null);
        }} 
        onSave={() => {
          setActiveBuilder(null);
          setEditingProgram(null);
        }}
        initialData={editingProgram}
      />
    );
  }

  if (activeBuilder === 'nutrition') {
    return (
      <NutritionBuilder 
        onCancel={() => {
          setActiveBuilder(null);
          setEditingProgram(null);
        }} 
        onSave={() => {
          setActiveBuilder(null);
          setEditingProgram(null);
        }}
        initialData={editingProgram}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Program Şablonları</h2>
          <p className="text-slate-500 text-sm">Öğrencilerine atayacağın programları oluştur.</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setShowAIModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition shadow-sm shadow-purple-200"
          >
            <Zap size={20} /> AI ile Oluştur
          </button>
          <button 
            onClick={() => setActiveBuilder('workout')}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm shadow-emerald-200"
          >
            <Plus size={20} /> Yeni Antrenman Şablonu
          </button>
          <button 
            onClick={() => setActiveBuilder('nutrition')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-sm shadow-green-200"
          >
            <Plus size={20} /> Yeni Beslenme Şablonu
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('workout')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'workout' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Dumbbell size={18} /> Antrenman & Kardiyo
        </button>
        <button 
          onClick={() => setActiveTab('nutrition')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'nutrition' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Utensils size={18} /> Beslenme
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
            <Layout size={48} className="mx-auto opacity-20 mb-4" />
            Bu kategoride henüz program şablonunuz yok.
          </div>
        )}
        
        {filteredPrograms.map(prog => (
          <div key={prog.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
               <button onClick={() => handleDelete(prog.id)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                 <Trash2 size={16} />
               </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${prog.type === 'cardio' ? 'bg-orange-100 text-orange-600' : prog.type === 'nutrition' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                {prog.type === 'cardio' ? <Flame size={20} /> : prog.type === 'nutrition' ? <Utensils size={20} /> : <Dumbbell size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 line-clamp-1">{prog.name || prog.title}</h3>
                <span className="text-xs text-slate-500 capitalize">{prog.type === 'manual' ? 'workout' : prog.type}</span>
              </div>
            </div>

            <div className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
              {prog.description || prog.content}
            </div>
            
            {/* Preview Tags */}
            {prog.days && (
              <div className="flex flex-wrap gap-2 mb-4">
                {prog.days.slice(0, 3).map(day => (
                  <span key={day.id} className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600">
                    {day.name} ({day.exercises.length})
                  </span>
                ))}
                {prog.days.length > 3 && <span className="text-[10px] text-slate-400">+{prog.days.length - 3} gün</span>}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
              <span className="text-xs text-slate-400">
                {prog.days 
                  ? `${prog.days.reduce((acc, d) => acc + d.exercises.length, 0)} Hareket` 
                  : (prog.exercises ? `${prog.exercises.length} Hareket` : 'AI İçerik')
                }
              </span>
              <button 
                onClick={() => {
                  if (prog.type === 'manual' || !prog.days && prog.type !== 'nutrition') {
                     // Legacy or Simple format - Just show alert for now or handle differently
                     alert("Bu eski formatlı bir program. Detaylarını sadece görüntüleyebilirsiniz.");
                  } else {
                    setEditingProgram(prog);
                    if (prog.type === 'nutrition') {
                       setActiveBuilder('nutrition');
                    } else {
                       setActiveBuilder('workout');
                    }
                  }
                }}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Düzenle
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Zap /> AI Program Asistanı
              </h3>
              <button onClick={() => setShowAIModal(false)} className="text-white/80 hover:text-white">Kapat</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!aiResponse ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Öğrenci Hedefi ve Profili
                  </label>
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Örn: 30 yaşında erkek, evde çalışacak, sadece dambıl var. Amacı yağ yakmak. Haftada 3 gün."
                    className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  ></textarea>
                  <div className="flex justify-end">
                     <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !aiPrompt}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                      {isGenerating ? 'Program Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Program Başlığı</label>
                    <input 
                      type="text" 
                      value={programTitle} 
                      onChange={(e) => setProgramTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700">{aiResponse}</pre>
                  </div>
                </div>
              )}
            </div>

            {aiResponse && (
               <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                 <button 
                   onClick={() => setAiResponse("")}
                   className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                 >
                   Geri Dön
                 </button>
                 <button 
                   onClick={handleSaveAI}
                   className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition flex items-center gap-2"
                 >
                   <Save size={18} /> Kaydet
                 </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
