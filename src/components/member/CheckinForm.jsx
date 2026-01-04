import { useState } from "react";
import { Smile, Meh, Frown, Save, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function CheckinForm({ onClose, onComplete }) {
  const { currentUser, userProfile } = useAuth();
  const [compliance, setCompliance] = useState(8);
  const [mood, setMood] = useState("neutral"); // good, neutral, bad
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "weekly_checkins"), {
        memberId: currentUser.uid,
        memberName: userProfile.name,
        trainerId: userProfile.trainerId,
        complianceScore: Number(compliance),
        mood,
        currentWeight: weight ? Number(weight) : null,
        notes,
        createdAt: serverTimestamp(),
        weekStartDate: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0] // Monday of current week
      });

      // Notify Trainer
      if (userProfile.trainerId) {
        await addDoc(collection(db, "notifications"), {
          recipientId: userProfile.trainerId,
          message: `${userProfile.name} haftalık kontrol formunu gönderdi. 📋`,
          type: "checkin_submitted",
          read: false,
          createdAt: serverTimestamp()
        });
      }

      alert("Kontrol formu gönderildi!");
      onComplete();
    } catch (error) {
      console.error("Error submitting check-in:", error);
      alert("Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
        <div>
          <h3 className="text-lg font-bold">Haftalık Kontrol</h3>
          <p className="text-emerald-100 text-xs">Geçen haftayı değerlendirelim.</p>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Compliance Slider */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Programa Uyumun (1-10)
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={compliance}
              onChange={(e) => setCompliance(e.target.value)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-xl font-bold text-emerald-600 w-8 text-center">{compliance}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">1: Hiç yapmadım - 10: Eksiksiz yaptım</p>
        </div>

        {/* Mood Selector */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Ruh Halin ve Enerjin
          </label>
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => setMood("good")}
              className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition ${mood === 'good' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
            >
              <Smile size={32} />
              <span className="text-xs font-medium">Harika</span>
            </button>
            <button 
              type="button"
              onClick={() => setMood("neutral")}
              className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition ${mood === 'neutral' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
            >
              <Meh size={32} />
              <span className="text-xs font-medium">Normal</span>
            </button>
            <button 
              type="button"
              onClick={() => setMood("bad")}
              className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition ${mood === 'bad' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
            >
              <Frown size={32} />
              <span className="text-xs font-medium">Yorgun</span>
            </button>
          </div>
        </div>

        {/* Weight Input */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Güncel Kilon (kg)
          </label>
          <input 
            type="number" 
            step="0.1"
            placeholder="Örn: 75.5"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Notlar & Sorular
          </label>
          <textarea 
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 h-24 resize-none"
            placeholder="Eğitmenine iletmek istediğin notlar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} /> Gönder
        </button>

      </form>
    </div>
  );
}

