import { useState } from "react";
import { Save, ArrowLeft, Utensils } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

export default function NutritionBuilder({ onCancel, onSave, initialData, isAssignedProgram = false }) {
  const { currentUser } = useAuth();
  
  const [title, setTitle] = useState(initialData?.title || initialData?.name || "");
  const [content, setContent] = useState(initialData?.content || initialData?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title) return alert("Lütfen program başlığını girin.");
    if (!content) return alert("Lütfen içerik girin.");
    
    // For nutrition programs, usually just the content string is passed when updating assigned program
    // But let's pass full object for consistency if needed, though StudentsTab expects content string mostly for nutrition updates.
    // Let's check StudentsTab logic: 
    // const updatePayload = isNutrition ? { content: updatedData } ...
    // So we should pass 'content' string if it's assigned program update, or the whole object?
    // Looking at StudentsTab: handleUpdateAssignedProgram(updatedData) uses updatedData as the string content for nutrition.
    // Wait, let's make it consistent. Let's pass content string for nutrition if assigned.
    
    if (isAssignedProgram) {
      onSave(content);
      return;
    }
    
    setSaving(true);
    try {
      const programData = {
        name: title, 
        title: title, 
        content: content,
        type: 'nutrition',
        trainerId: currentUser.uid,
        updatedAt: serverTimestamp(),
        isAI: false
      };

      if (initialData?.id) {
        await updateDoc(doc(db, "programs", initialData.id), programData);
      } else {
        programData.createdAt = serverTimestamp();
        await addDoc(collection(db, "programs"), programData);
      }
      onSave();
    } catch (error) {
      console.error("Error saving nutrition program:", error);
      alert("Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white min-h-screen absolute inset-0 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex justify-between items-center bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Utensils className="text-green-600" /> {initialData ? "Beslenme Şablonunu Düzenle" : "Yeni Beslenme Şablonu"}
            </h2>
            <p className="text-sm text-slate-500">Beslenme planını ve öğün detaylarını oluştur.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition font-medium disabled:opacity-50"
        >
          <Save size={20} /> {initialData ? "Güncelle" : "Kaydet"}
        </button>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Şablon Başlığı</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-green-500 text-lg font-medium"
              placeholder="Örn: Ketojenik Başlangıç Diyeti"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-2">Beslenme Planı İçeriği</label>
            <div className="relative flex-1">
              <textarea 
                className="w-full h-[60vh] p-6 border border-slate-200 rounded-lg focus:outline-none focus:border-green-500 text-base leading-relaxed resize-none font-mono bg-slate-50"
                placeholder="# Kahvaltı&#10;- 2 Yumurta&#10;- 1 Dilim Peynir&#10;&#10;# Öğle&#10;- Tavuk Salata"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
              <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded">
                Markdown formatı desteklenir
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

