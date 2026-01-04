import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, CheckCircle, AlertCircle, Save, Upload } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import ExercisesTab from "../components/trainer/ExercisesTab";
import ProgramsTab from "../components/trainer/ProgramsTab";
import StudentsTab from "../components/trainer/StudentsTab";
import ProductsTab from "../components/trainer/ProductsTab";
import SubscriptionTab from "../components/trainer/SubscriptionTab";
import OverviewTab from "../components/trainer/OverviewTab";
import AutomationTab from "../components/trainer/AutomationTab";
import NotificationBell from "../components/shared/NotificationBell";

export default function TrainerDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Onboarding State
  const [onboardingData, setOnboardingData] = useState({
    specialization: "",
    experience: "",
    bio: "",
    certificateUrl: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => auth.signOut();

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...onboardingData,
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      });
      window.location.reload(); 
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Hata oluştu: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userProfile?.status === 'pending' && !userProfile?.onboardingCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle /> Eğitmen Başvurusu
            </h1>
            <p className="text-emerald-100 mt-2">Hesabını onaylamamız için detaylı bilgilerine ihtiyacımız var.</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleOnboardingSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Uzmanlık Alanı</label>
                <select 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={onboardingData.specialization}
                  onChange={(e) => setOnboardingData({...onboardingData, specialization: e.target.value})}
                >
                  <option value="">Seçiniz...</option>
                  <option value="fitness">Fitness & Vücut Geliştirme</option>
                  <option value="yoga">Yoga & Pilates</option>
                  <option value="crossfit">Crossfit & Fonksiyonel</option>
                  <option value="nutrition">Beslenme Uzmanı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tecrübe (Yıl)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={onboardingData.experience}
                  onChange={(e) => setOnboardingData({...onboardingData, experience: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hakkında (Bio)</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Üyelere kendinden bahset..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  value={onboardingData.bio}
                  onChange={(e) => setOnboardingData({...onboardingData, bio: e.target.value})}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sertifika / Belge Linki</label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    required
                    placeholder="https://drive.google.com/..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={onboardingData.certificateUrl}
                    onChange={(e) => setOnboardingData({...onboardingData, certificateUrl: e.target.value})}
                  />
                  <button type="button" className="bg-slate-100 p-2 rounded-lg text-slate-600 hover:bg-slate-200" title="Dosya Yükle (Demo)">
                    <Upload size={20} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Şimdilik Drive veya Dropbox linki kabul ediyoruz.</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  Çıkış Yap
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : <><Save size={18} /> Başvuruyu Tamamla</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Onay Bekleniyor</h2>
          <p className="text-slate-600 mb-6">
            Başvurunuz alınmıştır. Yöneticilerimiz belgelerinizi inceledikten sonra hesabınızı aktif hale getirecektir.
          </p>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-700 underline"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-700">
          <h2 className="font-bold text-xl flex items-center gap-2">FitPortal <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded-full">Trainer</span></h2>
          <p className="text-sm text-slate-400 mt-1">{userProfile?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'overview' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Genel Bakış
          </button>
          <button onClick={() => setActiveTab('students')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'students' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Öğrencilerim
          </button>
          <button onClick={() => setActiveTab('exercises')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'exercises' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Hareketler
          </button>
          <button onClick={() => setActiveTab('programs')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'programs' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Programlar
          </button>
          <button onClick={() => setActiveTab('automation')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'automation' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Otomasyonlar
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'products' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Ürünlerim (Marketplace)
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'profile' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Profil & Ayarlar
          </button>
          <button onClick={() => setActiveTab('subscription')} className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'subscription' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            Abonelik Paketleri
          </button>
        </nav>
        <button onClick={handleLogout} className="p-4 text-slate-400 hover:text-white flex items-center gap-2 border-t border-slate-700">
          <LogOut size={18} /> Çıkış Yap
        </button>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header for Trainer */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center flex-shrink-0">
           <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
           <div className="flex items-center gap-4">
             <NotificationBell />
             <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
               {userProfile?.name?.[0]}
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'exercises' && <ExercisesTab />}
          {activeTab === 'students' && <StudentsTab />}
          {activeTab === 'programs' && <ProgramsTab />}
          {activeTab === 'automation' && <AutomationTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'subscription' && <SubscriptionTab />}
        </div>
      </main>
    </div>
  );
}
