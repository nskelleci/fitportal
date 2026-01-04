import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Save, CheckCircle, Activity, HeartPulse, Ruler, Weight } from "lucide-react";

export default function AnamnesisForm({ onComplete }) {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    height: "",
    weight: "",
    birthDate: "",
    gender: "male",
    activityLevel: "sedentary", // sedentary, lightly_active, moderately_active, very_active, extra_active
    goals: [], // weight_loss, muscle_gain, endurance, flexibility, health
    injuries: "",
    medicalConditions: "",
    experience: "beginner", // beginner, intermediate, advanced
  });

  const goalsOptions = [
    { id: 'weight_loss', label: 'Kilo Vermek' },
    { id: 'muscle_gain', label: 'Kas Kazanmak' },
    { id: 'endurance', label: 'Kondisyon Artırmak' },
    { id: 'flexibility', label: 'Esneklik' },
    { id: 'health', label: 'Genel Sağlık' }
  ];

  const activityLevels = [
    { id: 'sedentary', label: 'Hareketsiz (Masa başı iş, spor yok)' },
    { id: 'lightly_active', label: 'Az Hareketli (Haftada 1-3 gün hafif spor)' },
    { id: 'moderately_active', label: 'Orta Hareketli (Haftada 3-5 gün spor)' },
    { id: 'very_active', label: 'Çok Hareketli (Haftada 6-7 gün spor)' },
    { id: 'extra_active', label: 'Ekstra Hareketli (Profesyonel sporcu, ağır iş)' }
  ];

  const handleGoalToggle = (goalId) => {
    setFormData(prev => {
      const goals = prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId];
      return { ...prev, goals };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.height || !formData.weight || !formData.birthDate) {
      alert("Lütfen temel fiziksel bilgilerinizi giriniz.");
      return;
    }
    
    setLoading(true);
    try {
      // Save to 'anamnesis_forms' collection with user UID as document ID for easy 1-to-1 lookup
      await setDoc(doc(db, "anamnesis_forms", currentUser.uid), {
        ...formData,
        userId: currentUser.uid,
        userName: userProfile?.name || "Kullanıcı",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp() // In case it's new
      }, { merge: true }); // Merge to allow updates without overwriting created date if possible, though setDoc overwrites by default if not careful. merge: true is safer.

      // Also update user profile to mark anamnesis as done? 
      // Or we just check existence of doc. Let's update user profile for faster check.
      await setDoc(doc(db, "users", currentUser.uid), {
        anamnesisCompleted: true
      }, { merge: true });

      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error saving anamnesis:", error);
      alert("Kaydederken bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-emerald-600 p-6 text-white text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Activity /> Sağlık ve Hedef Formu
        </h2>
        <p className="text-emerald-100 mt-2">
          Sana en uygun programı hazırlayabilmemiz için seni daha yakından tanımalıyız.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        
        {/* Physical Stats */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Ruler className="text-emerald-600" /> Fiziksel Bilgiler
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Boy (cm)</label>
              <input 
                type="number" 
                placeholder="175"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.height}
                onChange={e => setFormData({...formData, height: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kilo (kg)</label>
              <input 
                type="number" 
                placeholder="70"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Doğum Tarihi</label>
               <input 
                type="date" 
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.birthDate}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Cinsiyet</label>
               <select 
                 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                 value={formData.gender}
                 onChange={e => setFormData({...formData, gender: e.target.value})}
               >
                 <option value="male">Erkek</option>
                 <option value="female">Kadın</option>
               </select>
            </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Spor Geçmişi</label>
               <select 
                 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                 value={formData.experience}
                 onChange={e => setFormData({...formData, experience: e.target.value})}
               >
                 <option value="beginner">Başlangıç (0-6 Ay)</option>
                 <option value="intermediate">Orta (6 Ay - 2 Yıl)</option>
                 <option value="advanced">İleri (+2 Yıl)</option>
               </select>
            </div>
          </div>
        </section>

        {/* Activity Level & Goals */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <HeartPulse className="text-emerald-600" /> Aktivite ve Hedefler
          </h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Günlük Aktivite Seviyesi</label>
            <select 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.activityLevel}
              onChange={e => setFormData({...formData, activityLevel: e.target.value})}
            >
              {activityLevels.map(level => (
                <option key={level.id} value={level.id}>{level.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Hedeflerin (Birden fazla seçebilirsin)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {goalsOptions.map(goal => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => handleGoalToggle(goal.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border transition text-left flex items-center gap-2 ${
                    formData.goals.includes(goal.id)
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                     formData.goals.includes(goal.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                  }`}>
                    {formData.goals.includes(goal.id) && <CheckCircle size={12} />}
                  </div>
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Medical Info */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Activity className="text-red-500" /> Sağlık Durumu
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sakatlıklar / Rahatsızlıklar</label>
              <textarea 
                rows="3"
                placeholder="Bel fıtığı, diz ağrısı vb. varsa lütfen detaylı yazın."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                value={formData.injuries}
                onChange={e => setFormData({...formData, injuries: e.target.value})}
              ></textarea>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kullanılan İlaçlar / Özel Durumlar</label>
              <textarea 
                rows="2"
                placeholder="Varsa belirtiniz..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                value={formData.medicalConditions}
                onChange={e => setFormData({...formData, medicalConditions: e.target.value})}
              ></textarea>
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : <>Kaydet ve Başla <Save /></>}
          </button>
        </div>

      </form>
    </div>
  );
}

