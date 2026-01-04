import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ArrowLeft, Search, Dumbbell, Flame, Layers, Calendar } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

export default function WorkoutBuilder({ onCancel, onSave, initialData, isAssignedProgram = false }) {
  const { currentUser } = useAuth();
  
  // Program Details
  const [programType, setProgramType] = useState(initialData?.type === 'cardio' ? 'cardio' : 'workout'); 
  const [programName, setProgramName] = useState(initialData?.name || initialData?.title || "");
  const [programDesc, setProgramDesc] = useState(initialData?.description || initialData?.content || "");
  
  // Content State (v2: Blocks/Phases support)
  // Default to one block if old data format is present
  const [blocks, setBlocks] = useState(() => {
    if (initialData?.blocks) {
      return initialData.blocks;
    }
    if (initialData?.days) {
      return [{ 
        id: 1, 
        name: "Faz 1", 
        duration: 4, 
        days: initialData.days 
      }];
    }
    return [{ 
      id: 1, 
      name: "Faz 1", 
      duration: 4, 
      days: [{ id: 1, name: "Gün 1", exercises: [] }] 
    }];
  });

  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id || 1);
  // Initialize activeDayId based on the first block's first day
  const [activeDayId, setActiveDayId] = useState(() => {
    const firstBlock = blocks[0];
    return firstBlock?.days?.[0]?.id || 1;
  });

  // Exercise Selection
  const [myExercises, setMyExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Helper to get current block and day
  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const activeDay = activeBlock?.days.find(d => d.id === activeDayId);

  // Fetch Trainer's Exercises
  useEffect(() => {
    const fetchExercises = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, "exercises"), where("trainerId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        setMyExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExercises();
  }, [currentUser]);

  // --- Block Management ---
  const handleAddBlock = () => {
    const newId = Date.now();
    const newBlock = {
      id: newId,
      name: `Faz ${blocks.length + 1}`,
      duration: 4,
      days: [{ id: Date.now() + 1, name: "Gün 1", exercises: [] }]
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newId);
    setActiveDayId(newBlock.days[0].id);
  };

  const handleRemoveBlock = (blockId) => {
    if (blocks.length === 1) return;
    const newBlocks = blocks.filter(b => b.id !== blockId);
    setBlocks(newBlocks);
    if (activeBlockId === blockId) {
      setActiveBlockId(newBlocks[0].id);
      setActiveDayId(newBlocks[0].days[0].id);
    }
  };

  const updateBlockField = (blockId, field, value) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b));
  };

  // --- Day Management ---
  const handleAddDay = () => {
    if (!activeBlock) return;
    const newDayId = Date.now();
    const newDay = { id: newDayId, name: `Gün ${activeBlock.days.length + 1}`, exercises: [] };
    
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return { ...b, days: [...b.days, newDay] };
      }
      return b;
    }));
    setActiveDayId(newDayId);
  };

  const handleRemoveDay = (dayId) => {
    if (!activeBlock || activeBlock.days.length === 1) return;
    
    const newDays = activeBlock.days.filter(d => d.id !== dayId);
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return { ...b, days: newDays };
      }
      return b;
    }));
    
    if (activeDayId === dayId) {
      setActiveDayId(newDays[0].id);
    }
  };

  const updateDayName = (dayId, newName) => {
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          days: b.days.map(d => d.id === dayId ? { ...d, name: newName } : d)
        };
      }
      return b;
    }));
  };

  // --- Exercise Management ---
  const handleAddExerciseToDay = (exercise) => {
    if (!activeBlock || !activeDay) return;

    const newExercise = {
      ...exercise,
      instanceId: Date.now(),
      sets: 3,
      reps: "10-12",
      weight: "",
      rest: "60",
      notes: ""
    };

    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          days: b.days.map(d => {
            if (d.id === activeDayId) {
              return { ...d, exercises: [...d.exercises, newExercise] };
            }
            return d;
          })
        };
      }
      return b;
    }));
  };

  const handleRemoveExercise = (instanceId) => {
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          days: b.days.map(d => {
            if (d.id === activeDayId) {
              return { ...d, exercises: d.exercises.filter(e => e.instanceId !== instanceId) };
            }
            return d;
          })
        };
      }
      return b;
    }));
  };

  const handleUpdateExercise = (instanceId, field, value) => {
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          days: b.days.map(d => {
            if (d.id === activeDayId) {
              return {
                ...d,
                exercises: d.exercises.map(ex => ex.instanceId === instanceId ? { ...ex, [field]: value } : ex)
              };
            }
            return d;
          })
        };
      }
      return b;
    }));
  };

  const handleSaveProgram = async () => {
    if (!programName) return alert("Lütfen program adını girin.");
    
    const programData = {
      name: programName,
      title: programName,
      description: programDesc,
      type: programType,
      blocks: blocks, // New v2 Structure
      days: blocks[0].days, // Backward compatibility: keep the first block's days at top level? Or just remove.
                            // Better to keep 'days' as a flat fallback or just migrate fully.
                            // Let's keep 'days' as blocks[0].days for simple clients/compatibility if needed.
      trainerId: currentUser.uid,
      updatedAt: serverTimestamp(),
      isAI: false,
      version: '2.0'
    };

    // If editing an assigned program, pass data to parent handler instead of saving to 'programs'
    if (isAssignedProgram) {
      onSave(programData);
      return;
    }

    try {
      if (initialData?.id) {
        await updateDoc(doc(db, "programs", initialData.id), programData);
      } else {
        programData.createdAt = serverTimestamp();
        await addDoc(collection(db, "programs"), programData);
      }
      onSave();
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Kaydetme hatası");
    }
  };

  const filteredExercises = myExercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    || ex.category?.toLowerCase().includes(searchQuery.toLowerCase()) 
  );

  return (
    <div className="bg-white min-h-screen absolute inset-0 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex justify-between items-center bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{initialData ? "Programı Düzenle (v2)" : "Yeni Antrenman Programı"}</h2>
            <p className="text-sm text-slate-500">Blok (Faz) bazlı antrenman planlayıcı.</p>
          </div>
        </div>
        <button 
          onClick={handleSaveProgram}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition font-medium"
        >
          <Save size={20} /> {initialData ? "Güncelle" : "Kaydet"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
          
          {/* Settings */}
          <div className="p-6 border-b border-slate-200 space-y-4 bg-white">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Program Tipi</label>
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button 
                   onClick={() => setProgramType("workout")}
                   className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition ${programType === 'workout' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                 >
                   <Dumbbell size={16} /> Antrenman
                 </button>
                 <button 
                   onClick={() => setProgramType("cardio")}
                   className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition ${programType === 'cardio' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}
                 >
                   <Flame size={16} /> Kardiyo
                 </button>
               </div>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Program Adı</label>
               <input 
                 type="text" 
                 className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                 placeholder="Örn: Hipertrofi Başlangıç"
                 value={programName}
                 onChange={(e) => setProgramName(e.target.value)}
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
               <textarea 
                 className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                 rows="2"
                 placeholder="Programın amacı ve detayları..."
                 value={programDesc}
                 onChange={(e) => setProgramDesc(e.target.value)}
               ></textarea>
             </div>
          </div>

          {/* Exercise Selector */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-200 bg-slate-100">
              <h3 className="font-bold text-slate-700 mb-2">Hareket Ekle</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Kütüphanede ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="text-center py-4 text-slate-400 text-sm">Yükleniyor...</div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm px-4">
                  Hareket bulunamadı. Önce "Egzersizler" sekmesinden kütüphanene hareket eklemelisin.
                </div>
              ) : (
                filteredExercises.map(ex => (
                  <button 
                    key={ex.id}
                    onClick={() => handleAddExerciseToDay(ex)}
                    className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition group flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{ex.name}</div>
                      <div className="text-xs text-slate-500">{ex.category}</div>
                    </div>
                    <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Main Content - Planner */}
        <div className="flex-1 bg-slate-100 flex flex-col min-h-0">
          
          {/* Blocks / Phases Bar */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 pt-2 gap-1 no-scrollbar">
            {blocks.map((block, index) => (
               <button
                 key={block.id}
                 onClick={() => { setActiveBlockId(block.id); setActiveDayId(block.days[0]?.id); }}
                 className={`px-4 py-2 rounded-t-lg font-medium text-sm flex items-center gap-2 transition relative group ${activeBlockId === block.id ? 'bg-white text-slate-800 border-t border-l border-r border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
               >
                 <Layers size={14} />
                 {block.name}
                 {activeBlockId === block.id && (
                    <span 
                      onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }}
                      className="ml-2 text-slate-400 hover:text-red-500"
                    >
                      ×
                    </span>
                 )}
               </button>
            ))}
            <button 
              onClick={handleAddBlock}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
            >
              + Faz Ekle
            </button>
          </div>

          {/* Active Block Settings (Duration etc) */}
          {activeBlock && (
            <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <label className="text-xs font-medium text-slate-500">Faz Adı:</label>
                 <input 
                   type="text" 
                   value={activeBlock.name}
                   onChange={(e) => updateBlockField(activeBlockId, 'name', e.target.value)}
                   className="border border-slate-200 rounded px-2 py-1 text-sm w-32"
                 />
               </div>
               <div className="flex items-center gap-2">
                 <label className="text-xs font-medium text-slate-500">Süre (Hafta):</label>
                 <input 
                   type="number" 
                   value={activeBlock.duration}
                   onChange={(e) => updateBlockField(activeBlockId, 'duration', Number(e.target.value))}
                   className="border border-slate-200 rounded px-2 py-1 text-sm w-16"
                 />
               </div>
            </div>
          )}
          
          {/* Day Tabs (Sub-nav) */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-4 pt-4 gap-2 no-scrollbar">
            {activeBlock?.days.map(day => (
              <button
                key={day.id}
                onClick={() => setActiveDayId(day.id)}
                className={`px-6 py-3 rounded-t-lg font-medium text-sm whitespace-nowrap transition relative group ${activeDayId === day.id ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                {day.name}
                {activeDayId === day.id && activeBlock.days.length > 1 && (
                   <span 
                     onClick={(e) => { e.stopPropagation(); handleRemoveDay(day.id); }}
                     className="ml-2 text-slate-400 hover:text-red-500"
                   >
                     ×
                   </span>
                )}
              </button>
            ))}
            <button 
              onClick={handleAddDay}
              className="px-4 py-3 rounded-t-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
            >
              + Gün Ekle
            </button>
          </div>

          {/* Day Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-800">
                    {activeDay?.name} Planı
                  </h3>
                  <input 
                    type="text" 
                    value={activeDay?.name || ''}
                    onChange={(e) => updateDayName(activeDayId, e.target.value)}
                    className="text-sm border-b border-slate-200 focus:border-blue-500 outline-none text-slate-500 w-24 ml-2"
                    placeholder="Gün Adı"
                  />
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  {activeDay?.exercises.length || 0} Hareket
                </span>
              </div>

              <div className="space-y-4">
                {activeDay?.exercises.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center">
                    <Dumbbell size={48} className="opacity-20 mb-4" />
                    <p>Bu güne henüz hareket eklenmemiş.</p>
                    <p className="text-sm mt-2">Sol menüden hareket seçerek ekleyebilirsin.</p>
                  </div>
                ) : (
                  activeDay?.exercises.map((ex, idx) => (
                    <div key={ex.instanceId} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition group bg-slate-50/50">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <span className="bg-slate-200 text-slate-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
                             {idx + 1}
                           </span>
                           <div>
                             <h4 className="font-bold text-slate-800">{ex.name}</h4>
                             <span className="text-xs text-slate-500">{ex.category}</span>
                           </div>
                         </div>
                         <button 
                           onClick={() => handleRemoveExercise(ex.instanceId)}
                           className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Set</label>
                          <input 
                            type="number" 
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 text-sm"
                            value={ex.sets}
                            onChange={(e) => handleUpdateExercise(ex.instanceId, "sets", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Tekrar/Süre</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 text-sm"
                            value={ex.reps}
                            onChange={(e) => handleUpdateExercise(ex.instanceId, "reps", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Ağırlık(kg)</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 text-sm"
                            value={ex.weight}
                            onChange={(e) => handleUpdateExercise(ex.instanceId, "weight", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Dinlenme(sn)</label>
                          <input 
                            type="number" 
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 text-sm"
                            value={ex.rest}
                            onChange={(e) => handleUpdateExercise(ex.instanceId, "rest", e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                         <input 
                           type="text" 
                           placeholder="Eğitmen notu (Örn: Tempo 3-0-1)"
                           className="w-full px-2 py-1.5 border-b border-slate-200 bg-transparent focus:border-blue-500 outline-none text-xs text-slate-600"
                           value={ex.notes}
                           onChange={(e) => handleUpdateExercise(ex.instanceId, "notes", e.target.value)}
                         />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
