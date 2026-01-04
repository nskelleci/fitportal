import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Package, CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { api } from "../../lib/api";

export default function SubscriptionTab() {
  const { userProfile, currentUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const currentPlanId = userProfile?.subscriptionPlanId || 'free';

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const q = query(collection(db, "saas_packages"), orderBy("price", "asc"));
        const snapshot = await getDocs(q);
        setPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handleUpgrade = async (pkg) => {
    if (!confirm(`${pkg.name} paketine geçiş yapmak istiyor musunuz? Fiyat: ${pkg.price}₺`)) return;
    
    setProcessingId(pkg.id);
    try {
      // Call Cloud Function for Payment Processing
      const result = await api.createSubscription({
        price: pkg.price,
        planName: pkg.name,
        // In real app, card token from Iyzico Checkout form comes here
        cardToken: "mock-token",
        userEmail: userProfile.email
      });
      
      console.log("Payment Result:", result.data);

      if (result.data.status === 'success') {
         // Update local DB (Ideally handled by Webhook, but for MVP/Prototype we do it here)
         await updateDoc(doc(db, "users", currentUser.uid), {
           subscriptionPlanId: pkg.id,
           subscriptionPlanName: pkg.name,
           memberLimit: pkg.memberLimit,
           subscriptionStatus: 'active'
         });
         alert("Abonelik başarıyla güncellendi!");
         window.location.reload();
      } else {
         alert("Ödeme başarısız: " + result.data.error);
      }

    } catch (error) {
      console.error("Subscription Error:", error);
      alert("Hata oluştu: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-center">
         <h2 className="text-2xl font-bold text-slate-800">Abonelik Paketleri</h2>
         <p className="text-slate-500 mt-2">İhtiyacınıza uygun planı seçin ve hemen başlayın.</p>
      </div>

      {/* Current Plan Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 flex justify-between items-center">
         <div>
           <h3 className="font-bold text-blue-900">Mevcut Plan: {userProfile?.subscriptionPlanName || 'Başlangıç (Free)'}</h3>
           <p className="text-sm text-blue-700 mt-1">
             Üye Limiti: {userProfile?.memberLimit || 3} Öğrenci
           </p>
         </div>
         <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-blue-600 font-bold text-sm">
           Aktif
         </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Free Plan (Hardcoded as baseline) */}
           <div className={`bg-white rounded-2xl shadow-sm border p-8 flex flex-col ${currentPlanId === 'free' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Başlangıç</h3>
              <div className="text-4xl font-bold text-slate-800 mb-6">0 ₺<span className="text-base font-normal text-slate-400">/ay</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={18} className="text-emerald-500" /> 3 Öğrenci Limiti</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={18} className="text-emerald-500" /> Temel Programlar</li>
              </ul>
              <button disabled={currentPlanId === 'free'} className="w-full py-3 rounded-xl font-bold border-2 border-slate-100 text-slate-400 disabled:opacity-50">
                {currentPlanId === 'free' ? 'Mevcut Plan' : 'Seç'}
              </button>
           </div>

           {/* Dynamic Packages */}
           {packages.map(pkg => (
             <div key={pkg.id} className={`bg-white rounded-2xl shadow-sm border p-8 flex flex-col relative overflow-hidden ${currentPlanId === pkg.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:shadow-md transition'}`}>
                {pkg.price > 500 && <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPÜLER</div>}
                <h3 className="text-xl font-bold text-slate-800 mb-2">{pkg.name}</h3>
                <div className="text-4xl font-bold text-slate-800 mb-6">{pkg.price} ₺<span className="text-base font-normal text-slate-400">/ay</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={18} className="text-emerald-500" /> {pkg.memberLimit} Öğrenci Limiti</li>
                  <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={18} className="text-emerald-500" /> {pkg.description}</li>
                  <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={18} className="text-emerald-500" /> AI Analiz Desteği</li>
                </ul>
                <button 
                  onClick={() => handleUpgrade(pkg)}
                  disabled={currentPlanId === pkg.id || processingId === pkg.id}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${currentPlanId === pkg.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-emerald-600'}`}
                >
                  {processingId === pkg.id ? <Loader2 className="animate-spin" /> : (currentPlanId === pkg.id ? 'Mevcut Plan' : 'Yükselt')}
                </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}

