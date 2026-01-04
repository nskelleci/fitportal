import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Save, Plus, Trash2, Image as ImageIcon, DollarSign, Video } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ImageUploader from "../shared/ImageUploader";

export default function ProfileTab() {
  const { userProfile, currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [basicInfo, setBasicInfo] = useState({
    bio: userProfile?.bio || "",
    specialization: userProfile?.specialization || "",
    experience: userProfile?.experience || ""
  });

  const [gallery, setGallery] = useState(userProfile?.gallery || []);
  const [pricing, setPricing] = useState(userProfile?.pricing || []);

  // New Item Inputs
  const [newPrice, setNewPrice] = useState({ title: "", price: "", features: "" });

  const handleImageUpload = async (url) => {
    const updatedGallery = [...gallery, { url, type: 'image', id: Date.now() }];
    setGallery(updatedGallery);
    await updateDoc(doc(db, "users", currentUser.uid), { gallery: updatedGallery });
  };

  const handleBasicSave = async () => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...basicInfo
      });
      alert("Profil bilgileri güncellendi!");
    } catch (error) {
      console.error("Error:", error);
      alert("Hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeGalleryItem = async (id) => {
    const updatedGallery = gallery.filter(item => item.id !== id);
    setGallery(updatedGallery);
    await updateDoc(doc(db, "users", currentUser.uid), { gallery: updatedGallery });
  };

  const addPricingItem = async () => {
    if (!newPrice.title || !newPrice.price) return;
    const updatedPricing = [...pricing, { ...newPrice, id: Date.now() }];
    setPricing(updatedPricing);
    setNewPrice({ title: "", price: "", features: "" });

    // Auto save
    await updateDoc(doc(db, "users", currentUser.uid), { pricing: updatedPricing });
  };

  const removePricingItem = async (id) => {
    const updatedPricing = pricing.filter(item => item.id !== id);
    setPricing(updatedPricing);
    await updateDoc(doc(db, "users", currentUser.uid), { pricing: updatedPricing });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* 1. Basic Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">1</span>
          Temel Bilgiler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Uzmanlık Alanı</label>
             <input 
               type="text" 
               className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
               value={basicInfo.specialization}
               onChange={(e) => setBasicInfo({...basicInfo, specialization: e.target.value})}
             />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Tecrübe (Yıl)</label>
             <input 
               type="number" 
               className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
               value={basicInfo.experience}
               onChange={(e) => setBasicInfo({...basicInfo, experience: e.target.value})}
             />
          </div>
          <div className="md:col-span-2">
             <label className="block text-sm font-medium text-slate-700 mb-1">Hakkında (Bio)</label>
             <textarea 
               rows="4"
               className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
               value={basicInfo.bio}
               onChange={(e) => setBasicInfo({...basicInfo, bio: e.target.value})}
             ></textarea>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={handleBasicSave}
            disabled={isLoading}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-600 transition flex items-center gap-2"
          >
            <Save size={18} /> Kaydet
          </button>
        </div>
      </div>

      {/* 2. Pricing Packages */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">2</span>
          Fiyat Paketleri
        </h3>
        
        {/* Add Form */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 flex flex-col md:flex-row gap-3 items-end">
           <div className="flex-1 w-full">
             <label className="text-xs font-bold text-slate-500 uppercase">Paket Adı</label>
             <input 
               type="text" 
               placeholder="Örn: 1 Aylık Uzaktan Eğitim"
               className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
               value={newPrice.title}
               onChange={(e) => setNewPrice({...newPrice, title: e.target.value})}
             />
           </div>
           <div className="w-full md:w-32">
             <label className="text-xs font-bold text-slate-500 uppercase">Fiyat (₺)</label>
             <input 
               type="number" 
               placeholder="2000"
               className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
               value={newPrice.price}
               onChange={(e) => setNewPrice({...newPrice, price: e.target.value})}
             />
           </div>
           <div className="flex-1 w-full">
             <label className="text-xs font-bold text-slate-500 uppercase">Özellikler</label>
             <input 
               type="text" 
               placeholder="Örn: Haftalık kontrol, WhatsApp destek"
               className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
               value={newPrice.features}
               onChange={(e) => setNewPrice({...newPrice, features: e.target.value})}
             />
           </div>
           <button 
             onClick={addPricingItem}
             className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition"
           >
             <Plus size={20} />
           </button>
        </div>

        {/* List */}
        <div className="space-y-2">
           {pricing.map(item => (
             <div key={item.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50">
               <div>
                 <h4 className="font-bold text-slate-800">{item.title}</h4>
                 <p className="text-xs text-slate-500">{item.features}</p>
               </div>
               <div className="flex items-center gap-4">
                 <span className="font-bold text-emerald-600">{item.price} ₺</span>
                 <button onClick={() => removePricingItem(item.id)} className="text-slate-400 hover:text-red-500">
                   <Trash2 size={18} />
                 </button>
               </div>
             </div>
           ))}
           {pricing.length === 0 && <p className="text-center text-slate-400 text-sm py-2">Henüz paket eklenmemiş.</p>}
        </div>
      </div>

      {/* 3. Media Gallery */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm">3</span>
          Medya Galerisi
        </h3>
        
        <div className="mb-6">
           <ImageUploader onUploadComplete={handleImageUpload} folder={`trainers/${currentUser.uid}/gallery`} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {gallery.map(item => (
             <div key={item.id} className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img src={item.url} alt="Gallery" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeGalleryItem(item.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
             </div>
           ))}
           {gallery.length === 0 && (
             <div className="col-span-full text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
               <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
               <p>Henüz görsel yüklenmemiş.</p>
             </div>
           )}
        </div>
      </div>

    </div>
  );
}
