import { useState, useEffect } from "react";
import { Calendar, Clock, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

export default function ActivityHistoryTab() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Composite index might be needed: memberId asc, createdAt desc
        const q = query(
          collection(db, "workout_reports"), 
          where("memberId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snapshot = await getDocs(q);
        setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching history:", error);
        // Fallback for missing index
        const q2 = query(collection(db, "workout_reports"), where("memberId", "==", currentUser.uid));
        const snap2 = await getDocs(q2);
        const list = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => b.createdAt - a.createdAt);
        setHistory(list);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [currentUser]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Yükleniyor...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Antrenman Geçmişi</h2>
      
      {history.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-dashed border-slate-200 text-center">
           <Dumbbell className="mx-auto text-slate-300 mb-4" size={48} />
           <h3 className="text-lg font-bold text-slate-700">Henüz antrenman yok</h3>
           <p className="text-slate-500 mt-1">İlk antrenmanını tamamladığında burada göreceksin.</p>
        </div>
      ) : (
        <div className="space-y-4">
           {history.map(item => (
             <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div 
                  onClick={() => toggleExpand(item.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Antrenman</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                         <span className="flex items-center gap-1"><Calendar size={12} /> {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}</span>
                         <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(item.duration / 60)} dk</span>
                      </div>
                    </div>
                  </div>
                  {expandedId === item.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>

                {/* Details */}
                {expandedId === item.id && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50">
                     {/* AI Analysis Summary */}
                     {item.aiAnalysis && (
                       <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                          <h5 className="font-bold text-slate-800 mb-2">AI Koç Özeti</h5>
                          <p>{item.aiAnalysis}</p>
                       </div>
                     )}

                     {/* Logs */}
                     <div className="space-y-3">
                        {item.logs && Object.entries(item.logs).map(([exerciseName, sets]) => (
                          <div key={exerciseName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                             <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                               {exerciseName}
                             </div>
                             <div className="p-3 grid grid-cols-3 gap-2">
                                {sets.map((set, idx) => (
                                  <div key={idx} className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 text-center">
                                     <span className="block font-bold text-emerald-600">{set.weight} kg</span>
                                     <span className="text-xs text-slate-400">{set.reps} tekrar</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}

