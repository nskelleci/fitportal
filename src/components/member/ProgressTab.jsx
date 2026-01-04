import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Camera, Ruler, TrendingUp, Calendar, X } from "lucide-react";
import ImageUploader from "../shared/ImageUploader";

export default function ProgressTab() {
  const { currentUser } = useAuth();
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [newData, setNewData] = useState({
    weight: "",
    waist: "",
    chest: "",
    arm: "",
    leg: "",
    date: new Date().toISOString().split('T')[0],
    photoFront: "",
    photoSide: "",
    photoBack: ""
  });

  // Chart State
  const [activeChart, setActiveChart] = useState("weight"); // weight, waist, chest, arm, leg

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "measurements"),
      where("userId", "==", currentUser.uid),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMeasurements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newData.weight) return alert("Kilo girilmesi zorunludur.");

    try {
      await addDoc(collection(db, "measurements"), {
        userId: currentUser.uid,
        date: newData.date,
        weight: Number(newData.weight),
        waist: newData.waist ? Number(newData.waist) : null,
        chest: newData.chest ? Number(newData.chest) : null,
        arm: newData.arm ? Number(newData.arm) : null,
        leg: newData.leg ? Number(newData.leg) : null,
        photoFront: newData.photoFront,
        photoSide: newData.photoSide,
        photoBack: newData.photoBack,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewData({
        weight: "", waist: "", chest: "", arm: "", leg: "",
        date: new Date().toISOString().split('T')[0],
        photoFront: "", photoSide: "", photoBack: ""
      });
    } catch (error) {
      console.error("Error saving measurement:", error);
      alert("Hata oluştu.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;
    try {
      await deleteDoc(doc(db, "measurements", id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Prepare chart data (filter out nulls for active metric)
  const chartData = measurements.filter(m => m[activeChart] !== null && m[activeChart] !== undefined);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <TrendingUp className="text-emerald-600" /> Gelişim Takibi
           </h2>
           <p className="text-slate-500 text-sm">Vücut ölçülerini ve kilonu düzenli takip et.</p>
         </div>
         <button 
           onClick={() => setShowAddModal(true)}
           className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
         >
           <Plus size={20} /> Yeni Ölçüm Ekle
         </button>
       </div>

       {/* Charts Section */}
       {measurements.length > 1 ? (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
               {['weight', 'waist', 'chest', 'arm', 'leg'].map(metric => (
                 <button
                   key={metric}
                   onClick={() => setActiveChart(metric)}
                   className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition whitespace-nowrap ${
                     activeChart === metric 
                     ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                     : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'
                   }`}
                 >
                   {metric === 'weight' ? 'Kilo' : 
                    metric === 'waist' ? 'Bel' : 
                    metric === 'chest' ? 'Göğüs' : 
                    metric === 'arm' ? 'Kol' : 'Bacak'}
                 </button>
               ))}
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('tr-TR')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={activeChart} 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
         </div>
       ) : (
         <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-center text-indigo-800">
           <TrendingUp className="mx-auto mb-2 opacity-50" />
           <p>Grafik görmek için en az 2 ölçüm kaydı girmelisin.</p>
         </div>
       )}

       {/* History Table */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
           Ölçüm Geçmişi
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
               <tr>
                 <th className="px-4 py-3">Tarih</th>
                 <th className="px-4 py-3">Kilo</th>
                 <th className="px-4 py-3">Bel</th>
                 <th className="px-4 py-3">Göğüs</th>
                 <th className="px-4 py-3">Kol</th>
                 <th className="px-4 py-3">Bacak</th>
                 <th className="px-4 py-3 text-right">İşlem</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {measurements.length === 0 && (
                 <tr>
                   <td colSpan="7" className="px-4 py-8 text-center text-slate-400">Henüz kayıt yok.</td>
                 </tr>
               )}
               {[...measurements].reverse().map((m) => (
                 <tr key={m.id} className="hover:bg-slate-50">
                   <td className="px-4 py-3 font-medium text-slate-800">
                     {new Date(m.date).toLocaleDateString('tr-TR')}
                   </td>
                   <td className="px-4 py-3">{m.weight} kg</td>
                   <td className="px-4 py-3">{m.waist ? `${m.waist} cm` : '-'}</td>
                   <td className="px-4 py-3">{m.chest ? `${m.chest} cm` : '-'}</td>
                   <td className="px-4 py-3">{m.arm ? `${m.arm} cm` : '-'}</td>
                   <td className="px-4 py-3">{m.leg ? `${m.leg} cm` : '-'}</td>
                   <td className="px-4 py-3 text-right">
                     <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-500">
                       <Trash2 size={16} />
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>

       {/* Add Modal */}
       {showAddModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
               <h3 className="text-lg font-bold flex items-center gap-2">
                 <Ruler /> Yeni Ölçüm Ekle
               </h3>
               <button onClick={() => setShowAddModal(false)} className="text-white/80 hover:text-white"><X size={20} /></button>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
                   <input 
                     type="date" 
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                     value={newData.date}
                     onChange={(e) => setNewData({...newData, date: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Kilo (kg)</label>
                   <input 
                     type="number" 
                     step="0.1"
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                     value={newData.weight}
                     onChange={(e) => setNewData({...newData, weight: e.target.value})}
                   />
                 </div>
               </div>

               <div>
                  <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Bölgesel Ölçüler (Opsiyonel)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bel (cm)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                        value={newData.waist}
                        onChange={(e) => setNewData({...newData, waist: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Göğüs (cm)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                        value={newData.chest}
                        onChange={(e) => setNewData({...newData, chest: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kol (cm)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                        value={newData.arm}
                        onChange={(e) => setNewData({...newData, arm: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bacak (cm)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                        value={newData.leg}
                        onChange={(e) => setNewData({...newData, leg: e.target.value})}
                      />
                    </div>
                  </div>
               </div>

               <div>
                 <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Form Fotoğrafları (Opsiyonel)</h4>
                 <div className="grid grid-cols-3 gap-4">
                   {['Front', 'Side', 'Back'].map((view) => (
                     <div key={view} className="space-y-2">
                       <span className="text-xs font-bold text-slate-500 uppercase">{view === 'Front' ? 'Ön' : view === 'Side' ? 'Yan' : 'Arka'}</span>
                       {newData[`photo${view}`] ? (
                         <div className="relative aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <img src={newData[`photo${view}`]} className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setNewData({...newData, [`photo${view}`]: ""})}
                              className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500"
                            >
                              <X size={12} />
                            </button>
                         </div>
                       ) : (
                         <div className="aspect-[3/4]">
                           <ImageUploader 
                             folder={`progress/${currentUser.uid}`}
                             onUploadComplete={(url) => setNewData({...newData, [`photo${view}`]: url})} 
                             variant="mini"
                           />
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>

               <div className="pt-4 flex justify-end gap-3">
                 <button 
                   onClick={() => setShowAddModal(false)}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                 >
                   İptal
                 </button>
                 <button 
                   onClick={handleSave}
                   className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                 >
                   Kaydet
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

