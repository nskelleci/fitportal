import { useState, useEffect } from "react";
import { User, Calendar, Activity, FileText, ChevronRight, Zap, ChevronDown, ChevronUp, CheckCircle, X, HeartPulse, MessageSquare, ClipboardCheck, Send, Edit2, Trash2, Archive, AlertTriangle } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, addDoc, serverTimestamp, getDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import ChatInterface from "../shared/ChatInterface";
import WorkoutBuilder from "./WorkoutBuilder";
import NutritionBuilder from "./NutritionBuilder";

export default function StudentsTab() {
  const { currentUser, userProfile } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentReports, setStudentReports] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [assignedPrograms, setAssignedPrograms] = useState([]); // New state for assigned programs
  const [anamnesisData, setAnamnesisData] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedProgramId, setExpandedProgramId] = useState(null);
  const [showAnamnesis, setShowAnamnesis] = useState(false); 
  
  // Active Tab in Student Detail
  const [detailTab, setDetailTab] = useState("programs"); // Default to programs now

  // Program Assignment State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Edit Assigned Program State
  const [editingProgram, setEditingProgram] = useState(null); // The program being edited

  // Chat Modal State
  const [showChatModal, setShowChatModal] = useState(false);

  // Feedback State
  const [feedbackText, setFeedbackText] = useState("");
  const [activeCheckinId, setActiveCheckinId] = useState(null);

  // Fetch Students
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, "users"), where("trainerId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Student Details
  useEffect(() => {
    if (!selectedStudent) return;

    const fetchData = async () => {
      setLoadingDetails(true);
      try {
        // Assigned Programs (Active Only)
        const qPrograms = query(
          collection(db, "assigned_programs"),
          where("memberId", "==", selectedStudent.id),
          where("status", "==", "active")
        );
        const snapPrograms = await getDocs(qPrograms);
        setAssignedPrograms(snapPrograms.docs.map(d => ({ id: d.id, ...d.data() })));

        // Reports
        const qReports = query(
          collection(db, "workout_reports"), 
          where("memberId", "==", selectedStudent.id)
        );
        const snapReports = await getDocs(qReports);
        const reports = snapReports.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side
        reports.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setStudentReports(reports.slice(0, 10)); // Limit client-side

        // Checkins
        const qCheckins = query(
          collection(db, "weekly_checkins"),
          where("memberId", "==", selectedStudent.id)
        );
        const snapCheckins = await getDocs(qCheckins);
        const checkinList = snapCheckins.docs.map(d => ({ id: d.id, ...d.data() }));
        checkinList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCheckins(checkinList.slice(0, 10));

        // Anamnesis
        const anamnesisDoc = await getDoc(doc(db, "anamnesis_forms", selectedStudent.id));
        if (anamnesisDoc.exists()) {
          setAnamnesisData(anamnesisDoc.data());
        } else {
          setAnamnesisData(null);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchData();
  }, [selectedStudent]);

  // Fetch Programs for Assignment Modal
  useEffect(() => {
    if (showAssignModal && currentUser) {
       const fetchPrograms = async () => {
         const q = query(collection(db, "programs"), where("trainerId", "==", currentUser.uid));
         const snap = await getDocs(q);
         setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
       };
       fetchPrograms();
    }
  }, [showAssignModal, currentUser]);

  const toggleReportDetails = (id) => {
    setExpandedReportId(expandedReportId === id ? null : id);
  };

  const handleSendFeedback = async (checkinId) => {
    if (!feedbackText.trim()) return;
    
    try {
      await updateDoc(doc(db, "weekly_checkins", checkinId), {
        trainerFeedback: feedbackText,
        feedbackAt: serverTimestamp()
      });

      // Notify Student
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedStudent.id,
        message: `Eğitmenin haftalık kontrol formuna yanıt verdi. 💬`,
        type: "checkin_feedback",
        read: false,
        createdAt: serverTimestamp()
      });

      // Update local state
      setCheckins(prev => prev.map(c => c.id === checkinId ? { ...c, trainerFeedback: feedbackText } : c));
      setFeedbackText("");
      setActiveCheckinId(null);
      alert("Geri bildirim gönderildi.");
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Hata oluştu.");
    }
  };

    const handleAssignProgram = async (program) => {
    if (!selectedStudent) return;
    
    if (!confirm(`${program.title} programını ${selectedStudent.name} adlı üyeye atamak istiyor musunuz?`)) return;
    
    setAssignLoading(true);
    try {
      // 1. Assign Program (v2 Concurrent Support)
      // We use addDoc to support multiple active programs
      await addDoc(collection(db, "assigned_programs"), {
        memberId: selectedStudent.id,
        trainerId: currentUser.uid,
        programId: program.id,
        title: program.title || program.name, 
        content: program.content || program.description || "",
        type: program.type || 'manual',
        days: program.days || null, // Legacy support
        blocks: program.blocks || null, // v2 Block support
        assignedAt: serverTimestamp(),
        status: 'active',
        currentWeek: 1 // Start at week 1
      });

      // 2. Create Notification for Member
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedStudent.id,
        message: `Eğitmenin ${userProfile.name} sana yeni bir program atadı: "${program.title}" 💪`,
        type: "program_assigned",
        read: false,
        createdAt: serverTimestamp()
      });

      alert("Program başarıyla atandı ve bildirim gönderildi!");
      setShowAssignModal(false);
      
      // Refresh assigned programs list
      const qPrograms = query(
        collection(db, "assigned_programs"),
        where("memberId", "==", selectedStudent.id),
        where("status", "==", "active")
      );
      const snapPrograms = await getDocs(qPrograms);
      setAssignedPrograms(snapPrograms.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error("Assignment Error:", error);
      alert("Hata oluştu.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUpdateAssignedProgram = async (updatedData) => {
    if (!editingProgram) return;
    
    try {
      // If it's a nutrition program, structure is different
      const isNutrition = editingProgram.type === 'nutrition';
      const updatePayload = isNutrition ? {
        content: updatedData, // For nutrition, updatedData is just text string
        updatedAt: serverTimestamp()
      } : {
        title: updatedData.title,
        description: updatedData.description,
        days: updatedData.days, // Legacy
        blocks: updatedData.blocks, // v2
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "assigned_programs", editingProgram.id), updatePayload);
      
      // Update local state
      setAssignedPrograms(prev => prev.map(p => 
        p.id === editingProgram.id ? { ...p, ...updatePayload } : p
      ));

      setEditingProgram(null);
      alert("Program güncellendi!");
    } catch (error) {
      console.error("Error updating program:", error);
      alert("Güncelleme hatası.");
    }
  };

  const handleArchiveProgram = async (programId) => {
    if (!confirm("Bu programı arşive kaldırmak istediğine emin misin? Öğrenci artık bu programı göremeyecek.")) return;
    
    try {
      await updateDoc(doc(db, "assigned_programs", programId), { status: "archived" });
      setAssignedPrograms(prev => prev.filter(p => p.id !== programId));
    } catch (error) {
      console.error("Error archiving program:", error);
      alert("Hata oluştu.");
    }
  };

  // If editing a program, show Full Screen Edit View instead of Modal
  if (editingProgram) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setEditingProgram(null)} 
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <ChevronRight className="rotate-180" />
              </button>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Program Düzenleniyor</h3>
                <p className="text-xs text-slate-500">Öğrenci: {selectedStudent?.name} • Program: {editingProgram.title}</p>
              </div>
            </div>
            <button 
              onClick={() => setEditingProgram(null)}
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-slate-200"
            >
              İptal
            </button>
         </div>
             <div className="flex-1 overflow-hidden">
                {editingProgram.type === 'nutrition' ? (
                  <NutritionBuilder 
                    initialData={editingProgram}
                    onSave={handleUpdateAssignedProgram}
                    isAssignedProgram={true}
                  />
                ) : (
                  <WorkoutBuilder 
                    initialData={editingProgram}
                    onSave={handleUpdateAssignedProgram}
                    isAssignedProgram={true}
                  />
                )}
             </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 relative">
      
      {/* Chat Modal */}
      {showChatModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden relative shadow-2xl">
            <button 
              onClick={() => setShowChatModal(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 shadow text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <ChatInterface 
              recipientId={selectedStudent.id} 
              recipientName={selectedStudent.name}
              currentUserRole="trainer"
            />
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800">Program Seç</h3>
               <button onClick={() => setShowAssignModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
             </div>
             <div className="p-4 overflow-y-auto space-y-2">
                {programs.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">Henüz program şablonunuz yok.</p>
                ) : (
                  programs.map(prog => (
                    <div key={prog.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition flex justify-between items-center">
                       <div>
                         <h4 className="font-bold text-slate-800">{prog.title}</h4>
                         <p className="text-xs text-slate-500 line-clamp-1">{prog.content}</p>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${prog.type === 'nutrition' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                           {prog.type === 'nutrition' ? 'Beslenme' : 'Antrenman'}
                         </span>
                       </div>
                       <button 
                         onClick={() => handleAssignProgram(prog)}
                         disabled={assignLoading}
                         className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                       >
                         Seç
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Student List */}
      <div className={`${selectedStudent ? 'hidden md:block w-1/3' : 'w-full'} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col`}>
         <div className="p-4 border-b border-slate-100 font-bold text-slate-800 flex justify-between">
           <span>Öğrencilerim</span>
           <span className="bg-emerald-100 text-emerald-700 px-2 rounded-full text-xs flex items-center">{students.length}</span>
         </div>
         <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {students.length === 0 && !loading && (
                <p className="text-center text-slate-400 py-8">Henüz öğrenciniz yok.</p>
            )}
            {students.map(student => (
              <div 
                key={student.id} 
                onClick={() => setSelectedStudent(student)}
                className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition ${selectedStudent?.id === student.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
                  {student.name ? student.name[0] : 'U'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">{student.name}</h4>
                  <p className="text-xs text-slate-500">Başlangıç: {student.subscriptionDate?.seconds ? new Date(student.subscriptionDate.seconds * 1000).toLocaleDateString('tr-TR') : 'Tarih Yok'}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))}
         </div>
      </div>

      {/* Student Detail View */}
      {selectedStudent ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <button onClick={() => setSelectedStudent(null)} className="md:hidden text-sm text-slate-500 mb-2">← Geri Dön</button>
                <h2 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h2>
                <p className="text-slate-500 text-sm">{selectedStudent.email}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                >
                  Program Ata
                </button>
                <button 
                  onClick={() => setShowChatModal(true)}
                  className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-2"
                >
                  <MessageSquare size={16} /> Mesaj
                </button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6">
              
              {/* Anamnesis Section */}
              <div className="mb-8">
                 <button 
                   onClick={() => setShowAnamnesis(!showAnamnesis)}
                   className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 font-bold"
                 >
                   <div className="flex items-center gap-2">
                     <HeartPulse size={20} /> Sağlık & Hedef Profili (Anamnez)
                   </div>
                   {showAnamnesis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </button>
                 
                 {showAnamnesis && (
                   <div className="bg-white border border-emerald-100 rounded-b-xl p-6 shadow-sm mt-[-1px] animate-fadeIn">
                     {anamnesisData ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">Fiziksel</h4>
                            <div className="space-y-2 text-sm text-slate-700">
                              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Boy:</span> <span className="font-medium">{anamnesisData.height} cm</span></div>
                              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Kilo:</span> <span className="font-medium">{anamnesisData.weight} kg</span></div>
                              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Yaş:</span> <span className="font-medium">{new Date().getFullYear() - new Date(anamnesisData.birthDate).getFullYear()}</span></div>
                              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Cinsiyet:</span> <span className="font-medium capitalize">{anamnesisData.gender === 'male' ? 'Erkek' : 'Kadın'}</span></div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">Aktivite & Hedef</h4>
                            <div className="space-y-2 text-sm text-slate-700">
                              <div className="flex flex-col border-b border-slate-50 pb-1">
                                <span className="text-slate-500 text-xs">Aktivite Seviyesi:</span> 
                                <span className="font-medium capitalize">{anamnesisData.activityLevel?.replace('_', ' ')}</span>
                              </div>
                              <div className="flex flex-col border-b border-slate-50 pb-1">
                                <span className="text-slate-500 text-xs">Hedefler:</span> 
                                <span className="font-medium capitalize">{anamnesisData.goals?.map(g => g.replace('_', ' ')).join(', ')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                             <h4 className="text-xs uppercase text-red-400 font-bold mb-2">Sağlık Durumu</h4>
                             <p className="text-sm text-slate-700 bg-red-50 p-3 rounded-lg border border-red-100">
                               <span className="block mb-1 font-bold">Sakatlıklar:</span> {anamnesisData.injuries || 'Yok'}
                               <span className="block mt-2 font-bold">Özel Durumlar:</span> {anamnesisData.medicalConditions || 'Yok'}
                             </p>
                          </div>
                       </div>
                     ) : (
                       <div className="text-center text-slate-400 py-4">
                         Öğrenci henüz sağlık formunu doldurmamış.
                       </div>
                     )}
                   </div>
                 )}
              </div>

              {/* Tabs Navigation */}
              <div className="flex items-center gap-4 mb-6 border-b border-slate-100">
                <button 
                  onClick={() => setDetailTab("programs")}
                  className={`pb-2 px-1 text-sm font-bold transition ${detailTab === 'programs' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Aktif Programlar
                </button>
                <button 
                  onClick={() => setDetailTab("reports")}
                  className={`pb-2 px-1 text-sm font-bold transition ${detailTab === 'reports' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Antrenman Raporları
                </button>
                <button 
                  onClick={() => setDetailTab("checkins")}
                  className={`pb-2 px-1 text-sm font-bold transition ${detailTab === 'checkins' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Haftalık Kontroller
                </button>
              </div>
              
              {loadingDetails ? (
                <div className="text-center py-8 text-slate-400">Veriler yükleniyor...</div>
              ) : (
                <>
                  {/* PROGRAMS TAB */}
                  {detailTab === 'programs' && (
                    assignedPrograms.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="mb-4">Bu öğrenciye atanmış aktif program yok.</p>
                        <button 
                          onClick={() => setShowAssignModal(true)}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
                        >
                          Hemen Program Ata
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {assignedPrograms.map(prog => (
                          <div key={prog.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5">
                             <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-3 rounded-lg ${prog.type === 'nutrition' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {prog.type === 'nutrition' ? <Activity size={24} /> : <FileText size={24} />}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 text-lg">{prog.title}</h4>
                                    <p className="text-xs text-slate-500">
                                      Atanma: {prog.assignedAt?.seconds ? new Date(prog.assignedAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleArchiveProgram(prog.id)}
                                    className="flex items-center gap-2 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 transition border border-slate-100"
                                    title="Arşive Kaldır"
                                  >
                                    <Archive size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setEditingProgram(prog)}
                                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 transition border border-indigo-100"
                                  >
                                    <Edit2 size={16} /> Düzenle
                                  </button>
                                </div>
                             </div>
                             
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600">
                               {prog.type === 'nutrition' ? (
                                 <div>
                                    <p className={expandedProgramId === prog.id ? "" : "line-clamp-3"}>{prog.content}</p>
                                    <button 
                                      onClick={() => setExpandedProgramId(expandedProgramId === prog.id ? null : prog.id)}
                                      className="text-emerald-600 font-bold text-xs mt-2 hover:underline"
                                    >
                                      {expandedProgramId === prog.id ? "Daha Az Göster" : "Tamamını Oku"}
                                    </button>
                                 </div>
                               ) : (
                                 <div>
                                   <p className="mb-2 font-medium text-slate-700">{prog.description}</p>
                                   
                                   {/* Summary Tags */}
                                   {prog.blocks ? (
                                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                        {prog.blocks.map((block, idx) => (
                                          <span key={idx} className="bg-white border border-slate-200 px-2 py-1 rounded text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {block.name}: {block.days?.length || 0} Gün
                                          </span>
                                        ))}
                                      </div>
                                   ) : prog.days && (
                                     <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                       {prog.days.map((day, idx) => (
                                         <span key={idx} className="bg-white border border-slate-200 px-2 py-1 rounded text-xs font-medium text-slate-500 whitespace-nowrap">
                                           {day.name || day.dayName}: {day.exercises?.length || 0} Hareket
                                         </span>
                                       ))}
                                     </div>
                                   )}

                                   {/* Expanded Details */}
                                   {expandedProgramId === prog.id && (
                                     <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 animate-fadeIn">
                                       {prog.blocks ? (
                                          // v2 Blocks View
                                          prog.blocks.map(block => (
                                            <div key={block.id} className="space-y-2">
                                              <h5 className="font-bold text-xs text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-1 mb-3">{block.name}</h5>
                                              {block.days.map(day => (
                                                 <div key={day.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
                                                   <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-xs uppercase flex justify-between">
                                                     <span>{day.name}</span>
                                                     <span>{day.exercises.length} Hareket</span>
                                                   </div>
                                                   <div className="divide-y divide-slate-100">
                                                     {day.exercises.map((ex, idx) => (
                                                       <div key={idx} className="p-2 flex justify-between items-center text-xs">
                                                         <div className="flex items-center gap-2">
                                                           <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                                                           <span className="font-bold text-slate-700">{ex.name}</span>
                                                         </div>
                                                         <div className="text-slate-500">
                                                           {ex.sets}x{ex.reps}
                                                         </div>
                                                       </div>
                                                     ))}
                                                   </div>
                                                 </div>
                                              ))}
                                            </div>
                                          ))
                                       ) : prog.days && (
                                          // Legacy Days View
                                          prog.days.map((day) => (
                                            <div key={day.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-xs uppercase flex justify-between">
                                                <span>{day.name || day.dayName}</span>
                                                <span>{day.exercises.length} Hareket</span>
                                              </div>
                                              <div className="divide-y divide-slate-100">
                                                {day.exercises.map((ex, idx) => (
                                                  <div key={idx} className="p-2 flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                                                      <span className="font-bold text-slate-700">{ex.name}</span>
                                                    </div>
                                                    <div className="text-slate-500">
                                                      {ex.sets} x {ex.reps} • {ex.weight ? `${ex.weight}kg` : 'Vücut'}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))
                                       )}
                                     </div>
                                   )}
                                   
                                   <button 
                                     onClick={() => setExpandedProgramId(expandedProgramId === prog.id ? null : prog.id)}
                                     className="w-full flex items-center justify-center gap-1 text-indigo-600 font-bold text-xs mt-3 hover:bg-indigo-50 py-2 rounded transition"
                                   >
                                     {expandedProgramId === prog.id ? (
                                       <>Detayları Gizle <ChevronUp size={14} /></>
                                     ) : (
                                       <>Program Detaylarını Gör <ChevronDown size={14} /></>
                                     )}
                                   </button>
                                 </div>
                               )}
                             </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* WORKOUT REPORTS TAB */}
                  {detailTab === 'reports' && (
                     studentReports.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Henüz antrenman raporu bulunmuyor.
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {studentReports.map(report => (
                             <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                                      <Calendar size={16} />
                                      {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'} 
                                      <span className="text-slate-300">•</span>
                                      {Math.floor(report.duration / 60)} Dakika
                                    </div>
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded uppercase">AI Analizli</span>
                                  </div>

                                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-3">
                                     <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                       <Zap size={16} className="text-purple-600" /> Koçun Notu (AI)
                                     </h4>
                                     <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                       {report.aiAnalysis}
                                     </p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => toggleReportDetails(report.id)}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800 py-2 bg-slate-50 rounded hover:bg-slate-100 transition"
                                  >
                                    {expandedReportId === report.id ? (
                                      <>Detayları Gizle <ChevronUp size={16} /></>
                                    ) : (
                                      <>Egzersiz Loglarını Gör <ChevronDown size={16} /></>
                                    )}
                                  </button>

                                  {/* Detail Logs Table */}
                                  {expandedReportId === report.id && report.logs && (
                                    <div className="mt-4 space-y-4 animate-fadeIn">
                                      {Object.entries(report.logs).map(([exerciseName, sets]) => (
                                        <div key={exerciseName} className="border border-slate-200 rounded-lg overflow-hidden">
                                           <div className="bg-slate-100 px-4 py-2 font-bold text-sm text-slate-700">
                                             {exerciseName}
                                           </div>
                                           <div className="p-2 bg-white">
                                              <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-400 mb-1 px-2">
                                                <span>SET</span>
                                                <span>KG</span>
                                                <span>TEKRAR</span>
                                              </div>
                                              {/* Bug Fix: Check if sets is array, otherwise show fallback or empty */}
                                              {Array.isArray(sets) ? sets.map((set, idx) => (
                                                <div key={idx} className="grid grid-cols-3 gap-2 text-sm text-slate-700 px-2 py-1 border-b border-slate-50 last:border-0">
                                                  <span className="font-medium text-slate-400">#{idx + 1}</span>
                                                  <span>{set.weight} kg</span>
                                                  <span>{set.reps} tekrar</span>
                                                </div>
                                              )) : (
                                                <div className="p-2 text-xs text-red-400">Veri formatı eski veya hatalı.</div>
                                              )}
                                           </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                             </div>
                           ))}
                        </div>
                      )
                  )}

                  {/* CHECKINS TAB */}
                  {detailTab === 'checkins' && (
                     checkins.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Henüz haftalık kontrol formu bulunmuyor.
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {checkins.map(checkin => (
                             <div key={checkin.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                               <div className="p-5">
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                       <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
                                          <ClipboardCheck className="text-emerald-600" size={20} />
                                          Haftalık Kontrol: {new Date(checkin.createdAt?.seconds * 1000).toLocaleDateString('tr-TR')}
                                       </div>
                                       <p className="text-xs text-slate-400">Hafta: {checkin.weekStartDate}</p>
                                    </div>
                                    <div className="flex gap-2">
                                       <div className="bg-slate-50 px-3 py-1 rounded text-xs font-bold flex flex-col items-center border border-slate-100">
                                          <span className="text-slate-400 uppercase text-[10px]">Kilo</span>
                                          <span className="text-slate-800">{checkin.currentWeight || '-'} kg</span>
                                       </div>
                                       <div className="bg-slate-50 px-3 py-1 rounded text-xs font-bold flex flex-col items-center border border-slate-100">
                                          <span className="text-slate-400 uppercase text-[10px]">Uyum</span>
                                          <span className="text-emerald-600">{checkin.complianceScore}/10</span>
                                       </div>
                                       <div className="bg-slate-50 px-3 py-1 rounded text-xs font-bold flex flex-col items-center border border-slate-100">
                                          <span className="text-slate-400 uppercase text-[10px]">Mod</span>
                                          <span className="text-2xl">{checkin.mood === 'good' ? '😊' : checkin.mood === 'bad' ? '😫' : '😐'}</span>
                                       </div>
                                    </div>
                                  </div>
                                  
                                  {/* Student Notes */}
                                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                                     <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">Öğrenci Notu</h4>
                                     <p className="text-sm text-indigo-900 italic">"{checkin.notes}"</p>
                                  </div>

                                  {/* Trainer Feedback Section */}
                                  {checkin.trainerFeedback ? (
                                     <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                        <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center gap-2">
                                          <CheckCircle size={14} /> Senin Geri Bildirimin
                                        </h4>
                                        <p className="text-sm text-slate-700">{checkin.trainerFeedback}</p>
                                     </div>
                                  ) : (
                                     <div className="mt-4 border-t border-slate-100 pt-4">
                                        {activeCheckinId === checkin.id ? (
                                          <div className="space-y-2 animate-fadeIn">
                                             <textarea 
                                               className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                               placeholder="Öğrenciye geri bildirim yaz..."
                                               rows="3"
                                               value={feedbackText}
                                               onChange={(e) => setFeedbackText(e.target.value)}
                                             ></textarea>
                                             <div className="flex justify-end gap-2">
                                                <button 
                                                  onClick={() => setActiveCheckinId(null)}
                                                  className="text-slate-500 text-sm px-3 py-1.5 hover:bg-slate-100 rounded"
                                                >
                                                  İptal
                                                </button>
                                                <button 
                                                  onClick={() => handleSendFeedback(checkin.id)}
                                                  className="bg-emerald-600 text-white text-sm px-4 py-1.5 rounded font-bold hover:bg-emerald-700 flex items-center gap-2"
                                                >
                                                  <Send size={14} /> Gönder
                                                </button>
                                             </div>
                                          </div>
                                        ) : (
                                          <button 
                                            onClick={() => setActiveCheckinId(checkin.id)}
                                            className="text-emerald-600 text-sm font-bold hover:underline flex items-center gap-1"
                                          >
                                            <MessageSquare size={16} /> Geri Bildirim Yaz
                                          </button>
                                        )}
                                     </div>
                                  )}
                               </div>
                             </div>
                           ))}
                        </div>
                      )
                  )}
                </>
              )}
           </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-slate-50 rounded-xl border border-slate-200 border-dashed items-center justify-center text-slate-400 flex-col">
           <User size={48} className="mb-4 opacity-20" />
           <p>Detaylarını görmek için listeden bir öğrenci seçin.</p>
        </div>
      )}
    </div>
  );
}
