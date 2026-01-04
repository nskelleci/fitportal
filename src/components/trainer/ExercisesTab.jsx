import { useState, useEffect } from "react";
import { Plus, Search, Trash2, PlayCircle, Youtube, Video, X, Database, Globe, BookOpen, Check, Dumbbell, Edit } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, getDocs, orderBy, updateDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

export default function ExercisesTab() {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState("my_library"); // 'my_library' | 'global_pool'
  const [exercises, setExercises] = useState([]);
  const [libraryExercises, setLibraryExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Video Player State
  const [playingVideo, setPlayingVideo] = useState(null);

  // Add/Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [newExercise, setNewExercise] = useState({
    name: "",
    category: "Göğüs",
    videoUrl: "",
    isCustom: true,
    originalId: null
  });

  // Fetch Trainer's Exercises
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, "exercises"), where("trainerId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExercises(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch System Exercise Library
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const q = query(collection(db, "exercise_library"), orderBy("name"));
        const snapshot = await getDocs(q);
        setLibraryExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching library:", error);
      }
    };
    fetchLibrary();
  }, []);

  const handleAddToMyLibrary = (globalEx) => {
    setNewExercise({
      name: globalEx.name,
      category: globalEx.category,
      videoUrl: "", // Starts empty, trainer can add theirs
      isCustom: false,
      originalId: globalEx.id
    });
    setShowAddModal(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newExercise.name) return;

    try {
      if (editingExerciseId) {
        // Update
        await updateDoc(doc(db, "exercises", editingExerciseId), {
           videoUrl: newExercise.videoUrl,
           // For custom exercises, allow name/category update
           ...(newExercise.isCustom && {
             name: newExercise.name,
             category: newExercise.category
           })
        });
        alert("Hareket güncellendi!");
      } else {
        // Create
        await addDoc(collection(db, "exercises"), {
          ...newExercise,
          trainerId: currentUser.uid,
          createdAt: serverTimestamp()
        });
        alert("Hareket kütüphanene eklendi!");
        setViewMode("my_library");
      }
      
      setShowAddModal(false);
      setEditingExerciseId(null);
      setNewExercise({ name: "", category: "Göğüs", videoUrl: "", isCustom: true, originalId: null });
      
    } catch (error) {
      console.error("Error saving exercise:", error);
      alert("İşlem başarısız");
    }
  };

  const handleEdit = (ex) => {
    setEditingExerciseId(ex.id);
    setNewExercise({
      name: ex.name,
      category: ex.category,
      videoUrl: ex.videoUrl || "",
      isCustom: ex.isCustom,
      originalId: ex.originalId || null
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu hareketi kütüphanenden silmek istediğine emin misin?")) return;
    try {
      await deleteDoc(doc(db, "exercises", id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // Helper to check if already in library
  const isInLibrary = (globalId) => {
    return exercises.some(ex => ex.originalId === globalId || ex.name === libraryExercises.find(l => l.id === globalId)?.name);
  };

  // Filter Helper
  const getFilteredExercises = (list) => {
    return list.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || ex.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  // Helper: Extract embed URL from various video links
  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    // YouTube
    // Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/v/
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&?\/]+)/);
    if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    
    // Vimeo
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    
    // Direct file or other
    return url;
  };

  const displayedMyExercises = getFilteredExercises(exercises);
  const displayedLibraryExercises = getFilteredExercises(libraryExercises);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Hareket Kütüphanesi</h2>
          <p className="text-slate-500 text-sm">Programlarında kullanacağın hareketleri yönet.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('my_library')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'my_library' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Kütüphanem
          </button>
          <button 
            onClick={() => setViewMode('global_pool')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 ${viewMode === 'global_pool' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Globe size={16} /> Global Havuz
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Hareket ara..." 
               className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           <select 
             className="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none bg-white"
             value={selectedCategory}
             onChange={(e) => setSelectedCategory(e.target.value)}
           >
             <option value="all">Tüm Bölgeler</option>
             <option value="Göğüs">Göğüs</option>
             <option value="Sırt">Sırt</option>
             <option value="Bacak">Bacak</option>
             <option value="Omuz">Omuz</option>
             <option value="Kol">Kol</option>
             <option value="Karın">Karın</option>
           </select>
           {viewMode === 'my_library' && (
             <button 
               onClick={() => {
                 setEditingExerciseId(null);
                 setNewExercise({ name: "", category: "Göğüs", videoUrl: "", isCustom: true, originalId: null });
                 setShowAddModal(true);
               }}
               className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition"
             >
               <Plus size={20} /> Özel Ekle
             </button>
           )}
        </div>

        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {/* MY LIBRARY VIEW */}
          {viewMode === 'my_library' && (
             <>
              {displayedMyExercises.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <BookOpen size={48} className="opacity-20 mb-4" />
                  <p className="mb-4">{exercises.length === 0 ? "Henüz kütüphanende hareket yok." : "Aranan kriterlere uygun hareket bulunamadı."}</p>
                  {exercises.length === 0 && <button onClick={() => setViewMode('global_pool')} className="text-emerald-600 font-medium hover:underline">Global Havuzdan Ekle</button>}
                </div>
              )}
              {displayedMyExercises.map(ex => (
                <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center overflow-hidden">
                      {ex.videoUrl ? (
                        ex.videoUrl.match(/\.(jpeg|jpg|gif|png)$/) ? <img src={ex.videoUrl} className="w-full h-full object-cover" /> : <Youtube size={24} />
                      ) : (
                        <Database size={24} className="opacity-50" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{ex.name}</h3>
                      <span className="text-xs text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">{ex.category}</span>
                      {ex.isCustom && <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Özel</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {ex.videoUrl && (
                      <button onClick={() => setPlayingVideo(ex)} className="text-slate-400 hover:text-blue-600 p-2" title="Videoyu İzle">
                        <PlayCircle size={20} />
                      </button>
                    )}
                    <button onClick={() => handleEdit(ex)} className="text-slate-400 hover:text-emerald-600 p-2 opacity-0 group-hover:opacity-100 transition" title="Düzenle">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(ex.id)} className="text-slate-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition" title="Sil">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
             </>
          )}

          {/* GLOBAL POOL VIEW */}
          {viewMode === 'global_pool' && (
             <>
               {displayedLibraryExercises.length === 0 && !loading && (
                 <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                   <Globe size={48} className="opacity-20 mb-4" />
                   <p>Aradığınız kriterlere uygun hareket bulunamadı.</p>
                 </div>
               )}
               {displayedLibraryExercises.map(ex => {
                 const added = isInLibrary(ex.id);
                 return (
                  <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                        {ex.gifUrl ? (
                          <img src={ex.gifUrl} className="w-full h-full object-cover" />
                        ) : (
                          <Dumbbell size={24} className="text-slate-400" />
                        )}
                        {added && <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center text-white"><Check size={24} /></div>}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{ex.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-xs text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">{ex.category}</span>
                           {ex.primaryMuscles && <span className="text-[10px] text-slate-400">{ex.primaryMuscles.join(', ')}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      {added ? (
                        <button disabled className="text-emerald-600 text-sm font-medium px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100 opacity-70">
                          Eklendi
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddToMyLibrary(ex)}
                          className="bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                          <Plus size={16} /> Kütüphaneme Ekle
                        </button>
                      )}
                    </div>
                  </div>
                 );
               })}
             </>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-xl w-full max-w-4xl overflow-hidden relative shadow-2xl">
             <button 
               onClick={() => setPlayingVideo(null)}
               className="absolute top-4 right-4 z-10 text-white bg-black/50 hover:bg-white/20 p-2 rounded-full transition backdrop-blur-sm"
             >
               <X size={24} />
             </button>
             <div className="aspect-video w-full bg-black flex items-center justify-center">
               {playingVideo.videoUrl.match(/\.(mp4|webm)$/) ? (
                 <video controls autoPlay className="w-full h-full">
                   <source src={playingVideo.videoUrl} type="video/mp4" />
                   Tarayıcınız video etiketini desteklemiyor.
                 </video>
               ) : (
                 <iframe 
                   src={getEmbedUrl(playingVideo.videoUrl)} 
                   title={playingVideo.name}
                   className="w-full h-full"
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                   allowFullScreen
                 ></iframe>
               )}
             </div>
             <div className="p-4 bg-slate-900 text-white">
               <h3 className="text-lg font-bold">{playingVideo.name}</h3>
               <span className="text-sm text-slate-400 uppercase">{playingVideo.category}</span>
             </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingExerciseId ? "Hareketi Düzenle" : (newExercise.isCustom ? "Yeni Özel Hareket" : "Hareketi Özelleştir")}
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hareket Adı</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                  value={newExercise.name}
                  readOnly={!newExercise.isCustom} // Global imports can't rename yet to keep integrity, or allow it? Let's restrict for now.
                  onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                />
                {!newExercise.isCustom && <p className="text-xs text-slate-400 mt-1">Global havuzdan alınan hareketin adı değiştirilemez.</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bölge</label>
                <select 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newExercise.category}
                  disabled={!newExercise.isCustom}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Kendi Videon (Opsiyonel)</label>
                <input 
                  type="url" 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newExercise.videoUrl}
                  onChange={(e) => setNewExercise({...newExercise, videoUrl: e.target.value})}
                  placeholder="Youtube veya Vimeo linki..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  {newExercise.isCustom 
                    ? "Video eklemezsen boş görünür." 
                    : "Video eklemezsen Global havuzdaki varsayılan GIF gösterilir."}
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  {editingExerciseId ? "Güncelle" : "Kütüphaneye Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
