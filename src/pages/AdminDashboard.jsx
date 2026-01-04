import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Check, X, ExternalLink, User, FileText, Package, Plus, Trash2, Edit, Dumbbell, Database } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy, writeBatch } from "firebase/firestore";
import ImageUploader from "../components/shared/ImageUploader";
import { INITIAL_EXERCISES } from "../lib/exercise_dataset";

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("trainers");
  const [pendingTrainers, setPendingTrainers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Package Form State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: "",
    price: "",
    memberLimit: "",
    description: ""
  });

  // Exercise Form State
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [newExercise, setNewExercise] = useState({
    name: "",
    category: "Göğüs",
    primaryMuscles: [],
    gifUrl: ""
  });

  const fetchPendingTrainers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "trainer"));
      const querySnapshot = await getDocs(q);
      const trainers = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'pending') {
          trainers.push({ id: doc.id, ...data });
        }
      });
      setPendingTrainers(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "saas_packages"), orderBy("price", "asc"));
      const querySnapshot = await getDocs(q);
      setPackages(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "exercise_library"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      setExercises(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trainers') fetchPendingTrainers();
    if (activeTab === 'packages') fetchPackages();
    if (activeTab === 'exercises') fetchExercises();
  }, [activeTab]);

  const handleApprove = async (trainerId) => {
    if(!confirm("Bu eğitmeni onaylamak istiyor musunuz?")) return;
    try {
      await updateDoc(doc(db, "users", trainerId), {
        status: 'active',
        approvedAt: serverTimestamp(),
        approvedBy: userProfile.uid
      });
      setPendingTrainers(prev => prev.filter(t => t.id !== trainerId));
    } catch (error) {
      console.error("Error approving:", error);
      alert("İşlem başarısız");
    }
  };

  const handleReject = async (trainerId) => {
    if(!confirm("Bu eğitmen başvurusunu reddetmek istiyor musunuz?")) return;
    try {
      await updateDoc(doc(db, "users", trainerId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: userProfile.uid
      });
      setPendingTrainers(prev => prev.filter(t => t.id !== trainerId));
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("İşlem başarısız");
    }
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "saas_packages"), {
        ...newPackage,
        price: Number(newPackage.price),
        memberLimit: Number(newPackage.memberLimit),
        createdAt: serverTimestamp()
      });
      setShowPackageModal(false);
      setNewPackage({ name: "", price: "", memberLimit: "", description: "" });
      fetchPackages();
      alert("Paket oluşturuldu!");
    } catch (error) {
      console.error("Error adding package:", error);
      alert("Hata oluştu");
    }
  };

  const handleDeletePackage = async (id) => {
    if(!confirm("Paketi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "saas_packages", id));
      setPackages(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting package:", error);
    }
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExercise.name) return alert("Lütfen hareket adını girin.");
    
    try {
      if (editingExerciseId) {
        // Update existing
        await updateDoc(doc(db, "exercise_library", editingExerciseId), {
          ...newExercise,
          updatedAt: serverTimestamp()
        });
        alert("Hareket güncellendi!");
      } else {
        // Add new
        await addDoc(collection(db, "exercise_library"), {
          ...newExercise,
          createdAt: serverTimestamp()
        });
        alert("Hareket eklendi!");
      }
      
      setShowExerciseModal(false);
      setEditingExerciseId(null);
      setNewExercise({ name: "", category: "Göğüs", primaryMuscles: [], gifUrl: "" });
      fetchExercises();
    } catch (error) {
      console.error("Error saving exercise:", error);
      alert("Hata oluştu");
    }
  };

  const handleEditExercise = (ex) => {
    setEditingExerciseId(ex.id);
    setNewExercise({
      name: ex.name,
      category: ex.category,
      primaryMuscles: ex.primaryMuscles || [],
      gifUrl: ex.gifUrl || ""
    });
    setShowExerciseModal(true);
  };

  const handleDeleteExercise = async (id) => {
    if(!confirm("Hareketi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "exercise_library", id));
      setExercises(prev => prev.filter(ex => ex.id !== id));
    } catch (error) {
      console.error("Error deleting exercise:", error);
    }
  };

  const handleGifUpload = (url) => {
    setNewExercise(prev => ({ ...prev, gifUrl: url }));
  };

  // Seed Database Function
  const seedDatabase = async () => {
    if (!confirm("Bu işlem veri tabanına toplu hareket ekleyecek. Onaylıyor musunuz?")) return;
    
    const batch = writeBatch(db);
    const collectionRef = collection(db, "exercise_library");

    try {
      INITIAL_EXERCISES.forEach((ex) => {
        const docRef = doc(collectionRef); // Auto-ID
        batch.set(docRef, {
          ...ex,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      alert("Veri seti başarıyla yüklendi!");
      fetchExercises();
    } catch (error) {
      console.error("Seeding error:", error);
      alert("Hata: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">Yönetici Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Sistem Yönetimi</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('trainers')} 
            className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${activeTab === 'trainers' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <User size={20} /> Eğitmen Onayı
            {pendingTrainers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-auto">{pendingTrainers.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('packages')} 
            className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${activeTab === 'packages' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Package size={20} /> SaaS Paketleri
          </button>
          <button 
            onClick={() => setActiveTab('exercises')} 
            className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${activeTab === 'exercises' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Dumbbell size={20} /> Hareket Kütüphanesi
          </button>
        </nav>
        <button onClick={() => auth.signOut()} className="p-4 text-slate-400 hover:text-white flex items-center gap-2 border-t border-slate-700">
          <LogOut size={18} /> Çıkış Yap
        </button>
      </aside>
      
      {/* Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* TRAINERS TAB */}
        {activeTab === 'trainers' && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <User className="text-emerald-600" /> Bekleyen Eğitmen Başvuruları
              </h2>
              <p className="text-slate-500 mt-1">Belgeleri inceleyip onay veya red verin.</p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
            ) : pendingTrainers.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
                <Check size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-800">Her şey yolunda!</h3>
                <p className="text-slate-500">Şu an bekleyen başvuru bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingTrainers.map(trainer => (
                  <div key={trainer.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{trainer.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium uppercase">{trainer.specialization || 'Belirtilmemiş'}</span>
                          <span>•</span>
                          <span>{trainer.experience ? `${trainer.experience} Yıl Tecrübe` : 'Tecrübe girilmemiş'}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                        {trainer.createdAt?.seconds ? new Date(trainer.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : 'Tarih Yok'}
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Hakkında</h4>
                        <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {trainer.bio || 'Biyografi girilmemiş.'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Belgeler</h4>
                        {trainer.certificateUrl ? (
                          <a 
                            href={trainer.certificateUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 p-3 rounded-lg transition border border-blue-100 group"
                          >
                            <FileText size={20} />
                            <span className="font-medium text-sm">Sertifikayı Görüntüle</span>
                            <ExternalLink size={14} className="ml-auto group-hover:translate-x-1 transition" />
                          </a>
                        ) : (
                          <div className="text-slate-400 text-sm italic flex items-center gap-2">
                            <X size={16} /> Belge yüklenmemiş
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                      <button onClick={() => handleReject(trainer.id)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">Reddet</button>
                      <button onClick={() => handleApprove(trainer.id)} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition">Onayla</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PACKAGES TAB */}
        {activeTab === 'packages' && (
          <div>
             <div className="flex justify-between items-center mb-8">
               <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Package className="text-blue-600" /> SaaS Abonelik Paketleri
                 </h2>
                 <p className="text-slate-500 mt-1">Trainer'lar için üyelik paketlerini yönetin.</p>
               </div>
               <button 
                 onClick={() => setShowPackageModal(true)}
                 className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
               >
                 <Plus size={20} /> Yeni Paket
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map(pkg => (
                  <div key={pkg.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                       <button onClick={() => handleDeletePackage(pkg.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-4">{pkg.price} ₺ <span className="text-sm text-slate-400 font-normal">/ Ay</span></div>
                    
                    <div className="space-y-3 text-sm text-slate-600 mb-6">
                       <div className="flex items-center gap-2">
                         <Check size={16} className="text-green-500" />
                         <span>{pkg.memberLimit} Öğrenci Limiti</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Check size={16} className="text-green-500" />
                         <span>{pkg.description}</span>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* EXERCISES TAB (ADMIN) */}
        {activeTab === 'exercises' && (
          <div>
             <div className="flex justify-between items-center mb-8">
               <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Dumbbell className="text-emerald-600" /> Hareket Kütüphanesi
                 </h2>
                 <p className="text-slate-500 mt-1">Tüm sistemdeki hareketleri ve GIF'leri yönetin.</p>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={seedDatabase}
                   className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-200 transition border border-slate-200"
                 >
                   <Database size={18} /> Dataset'i Yükle
                 </button>
                 <button 
                   onClick={() => {
                     setEditingExerciseId(null);
                     setNewExercise({ name: "", category: "Göğüs", primaryMuscles: [], gifUrl: "" });
                     setShowExerciseModal(true);
                   }}
                   className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition"
                 >
                   <Plus size={20} /> Hareket Ekle
                 </button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {exercises.map(ex => (
                  <div key={ex.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden group relative flex flex-col h-full">
                     <div className="aspect-video bg-slate-100 relative flex-shrink-0">
                       {ex.gifUrl ? (
                         <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="flex items-center justify-center h-full text-slate-300"><Dumbbell size={32} /></div>
                       )}
                       <button 
                         onClick={() => handleDeleteExercise(ex.id)}
                         className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                     <div className="p-3 flex-1 flex flex-col">
                       <h4 className="font-bold text-slate-800 text-sm">{ex.name}</h4>
                       <div className="flex justify-between items-center mt-1">
                         <span className="text-xs text-slate-500 uppercase">{ex.category}</span>
                         {ex.primaryMuscles && (
                           <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 line-clamp-1 max-w-[60%]">
                             {ex.primaryMuscles[0]}
                           </span>
                         )}
                       </div>
                       <button 
                         onClick={() => handleEditExercise(ex)}
                         className="mt-3 w-full py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 rounded flex items-center justify-center gap-2 transition"
                       >
                         <Edit size={14} /> Düzenle
                       </button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

      </main>

      {/* Add Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Yeni Paket Oluştur</h3>
            <form onSubmit={handleAddPackage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paket Adı</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  value={newPackage.name}
                  onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                  placeholder="Örn: Pro Plan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fiyat (₺)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage({...newPackage, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Üye Limiti</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    value={newPackage.memberLimit}
                    onChange={(e) => setNewPackage({...newPackage, memberLimit: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  value={newPackage.description}
                  onChange={(e) => setNewPackage({...newPackage, description: e.target.value})}
                  placeholder="Örn: Sınırsız program oluşturma"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Exercise Modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingExerciseId ? "Hareketi Düzenle" : "Yeni Hareket Ekle"}</h3>
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hareket Adı</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                  placeholder="Örn: Bench Press"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bölge</label>
                <select 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  value={newExercise.category}
                  onChange={(e) => setNewExercise({...newExercise, category: e.target.value})}
                >
                  <option value="Göğüs">Göğüs</option>
                  <option value="Sırt">Sırt</option>
                  <option value="Bacak">Bacak</option>
                  <option value="Omuz">Omuz</option>
                  <option value="Kol">Kol</option>
                  <option value="Karın">Karın</option>
                  <option value="Kardiyo">Kardiyo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Birincil Kas Grupları (Opsiyonel)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  value={newExercise.primaryMuscles ? newExercise.primaryMuscles.join(", ") : ""}
                  onChange={(e) => setNewExercise({...newExercise, primaryMuscles: e.target.value.split(",").map(s => s.trim())})}
                  placeholder="Örn: Pectoralis Major, Triceps (Virgülle ayırın)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GIF / Video Yükle</label>
                {newExercise.gifUrl ? (
                   <div className="relative h-32 w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                     <img src={newExercise.gifUrl} alt="Preview" className="w-full h-full object-cover" />
                     <button 
                       type="button"
                       onClick={() => setNewExercise(prev => ({ ...prev, gifUrl: "" }))}
                       className="absolute top-2 right-2 bg-white p-1 rounded-full shadow text-slate-500 hover:text-red-500"
                     >
                       <X size={14} />
                     </button>
                   </div>
                ) : (
                   <ImageUploader onUploadComplete={handleGifUpload} folder="exercises" />
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowExerciseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  {editingExerciseId ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
