import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Activity, Search, PieChart, Zap, Dumbbell, PlayCircle, X, CheckCircle, Share2, Award, TrendingUp, MessageSquare, ClipboardCheck } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { generateAIContent } from "../lib/ai";
import { checkAndAwardBadges } from "../lib/gamification";
import MarketplaceTab from "../components/member/MarketplaceTab";
import ActiveWorkout from "../components/member/ActiveWorkout";
import MemberProfileTab from "../components/member/MemberProfileTab";
import ActivityHistoryTab from "../components/member/ActivityHistoryTab";
import NotificationBell from "../components/shared/NotificationBell";
import AnamnesisForm from "../components/member/AnamnesisForm";
import ProgressTab from "../components/member/ProgressTab";
import ChatInterface from "../components/shared/ChatInterface";
import CheckinForm from "../components/member/CheckinForm";

export default function MemberDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Gamification State
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState([]);

  // Active Program State
  const [activePrograms, setActivePrograms] = useState([]);
  const [selectedDayIndices, setSelectedDayIndices] = useState({}); // { programId: dayIndex }
  
  // Current Workout Session State
  const [currentProgram, setCurrentProgram] = useState(null); // The program being performed
  const [previewProgram, setPreviewProgram] = useState(null); // The program being previewed

  const [loadingProgram, setLoadingProgram] = useState(true);

  // Checkin Modal State
  const [showCheckinModal, setShowCheckinModal] = useState(false);

  // Anamnesis Modal State
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);

  const handleLogout = () => auth.signOut();

  // Check for Anamnesis Completion
  useEffect(() => {
    if (userProfile && !userProfile.anamnesisCompleted) {
      setShowAnamnesisModal(true);
    }
  }, [userProfile]);

  // Fetch Assigned Programs
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchPrograms = async () => {
      try {
        const q = query(
          collection(db, "assigned_programs"),
          where("memberId", "==", currentUser.uid),
          where("status", "==", "active")
        );
        const snapshot = await getDocs(q);
        
        // Sort client-side
        const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        programs.sort((a, b) => b.assignedAt?.seconds - a.assignedAt?.seconds);
        setActivePrograms(programs);
        
        // Initialize selected day indices
        const indices = {};
        programs.forEach(p => indices[p.id] = 0);
        setSelectedDayIndices(indices);

      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoadingProgram(false);
      }
    };
    
    fetchPrograms();
  }, [currentUser]);

  const handleFinishWorkout = async (logs, duration) => {
    // Capture program details before resetting state
    const programDetails = currentProgram ? {
      programId: currentProgram.id,
      programTitle: currentProgram.title,
      dayName: currentProgram.days && currentProgram.days[currentProgram.currentDayIndex]?.name
    } : {};

    setIsWorkoutActive(false);
    // Keep currentProgram for a moment if needed or rely on captured variable
    // setCurrentProgram(null); // We can clear it later or now. Clearing now is fine since we captured details.
    
    setIsAnalyzing(true);
    
    try {
      // 1. AI Analysis
      const logSummary = JSON.stringify(logs);
      const prompt = `Öğrenci az önce antrenmanı bitirdi. Süre: ${duration} saniye. Loglar: ${logSummary}. 
      Bu verilere bakarak antrenman performansını yorumla ve eğitmene kısa bir rapor sun. 
      Sen bir Fitness Koçusun, motive edici ama gerçekçi ol.
      Format: "Özet: [cümle]", "Gelişim Alanı: [cümle]", "Öneri: [cümle]"`;
      
      const analysis = await generateAIContent(prompt);

      // 2. Save to DB
      await addDoc(collection(db, "workout_reports"), {
        memberId: currentUser.uid,
        memberName: userProfile.name,
        trainerId: userProfile.trainerId || null, 
        ...programDetails, // Add Program Context
        duration,
        logs,
        aiAnalysis: analysis,
        createdAt: serverTimestamp()
      });

      // 3. Notify Trainer
      if (userProfile.trainerId) {
        await addDoc(collection(db, "notifications"), {
            recipientId: userProfile.trainerId,
            message: `${userProfile.name} "${programDetails.programTitle || 'Antrenman'}" antrenmanını tamamladı! Raporu incele. 📝`,
            type: "workout_finished",
            read: false,
            createdAt: serverTimestamp()
        });
      }

      // 4. Gamification Check
      const newBadges = await checkAndAwardBadges(currentUser.uid, { duration, logs });
      if (newBadges.length > 0) {
        setEarnedBadges(newBadges);
        setShowBadgeModal(true);
      } else {
        // If no badges, show report directly
        setReportData({ duration, analysis, logs });
        setShowReportModal(true);
      }

      // Temporarily store report data to show after badge modal
      setReportData({ duration, analysis, logs });

    } catch (error) {
      console.error("Analysis Error:", error);
      alert("Kaydedildi ancak analiz edilemedi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeBadgeModal = () => {
    setShowBadgeModal(false);
    setShowReportModal(true); // Show report after badge celebration
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      {/* Anamnesis Modal (First Login) */}
      {showAnamnesisModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <AnamnesisForm onComplete={() => {
            setShowAnamnesisModal(false);
            window.location.reload(); // Reload to refresh userProfile context if needed or just proceed
          }} />
        </div>
      )}

      {/* Checkin Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <CheckinForm onClose={() => setShowCheckinModal(false)} onComplete={() => setShowCheckinModal(false)} />
        </div>
      )}

      {/* Program Preview Modal */}
      {previewProgram && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                 <h3 className="font-bold text-slate-800">
                   {previewProgram.days ? (previewProgram.days[previewProgram.currentDayIndex]?.name || `Gün ${previewProgram.currentDayIndex+1}`) : previewProgram.title}
                 </h3>
                 <p className="text-xs text-slate-500">Antrenman Detayları</p>
              </div>
              <button onClick={() => setPreviewProgram(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
               {previewProgram.days && previewProgram.days[previewProgram.currentDayIndex]?.exercises.map((ex, idx) => (
                 <div key={idx} className="mb-4 last:mb-0 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                   <div className="flex items-start gap-3">
                     <span className="bg-slate-100 text-slate-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">
                       {idx + 1}
                     </span>
                     <div>
                       <h4 className="font-bold text-slate-800 text-sm">{ex.name}</h4>
                       <p className="text-xs text-slate-500">{ex.sets} Set x {ex.reps} • {ex.rest}sn Dinlenme</p>
                       {ex.notes && <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded inline-block">Not: {ex.notes}</p>}
                     </div>
                   </div>
                 </div>
               ))}
            </div>
            <div className="p-4 border-t border-slate-100">
               <button 
                 onClick={() => {
                   setCurrentProgram(previewProgram); // Transfer to current
                   setPreviewProgram(null);
                   setIsWorkoutActive(true);
                 }}
                 className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
               >
                 <PlayCircle size={20} /> Antrenmanı Başlat
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Workout Overlay */}
      {isWorkoutActive && currentProgram && (
        <ActiveWorkout 
          program={currentProgram} // Pass dynamic program
          initialDayIndex={currentProgram.currentDayIndex} // Pass selected day
          onClose={() => {
            if(confirm("Antrenmanı iptal etmek istiyor musun? Kaydedilmeyecek.")) {
              setIsWorkoutActive(false);
              setCurrentProgram(null);
            }
          }} 
          onFinish={handleFinishWorkout} 
        />
      )}

      {/* Analyzing Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white">
          <Zap size={48} className="animate-pulse text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold">AI Performansını Analiz Ediyor...</h2>
          <p className="text-white/70 mt-2">Antrenman verilerin işleniyor.</p>
        </div>
      )}

      {/* Badge Celebration Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fadeIn">
           <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/20 to-transparent pointer-events-none"></div>
              <Award size={64} className="mx-auto text-yellow-500 mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Tebrikler!</h2>
              <p className="text-slate-500 mb-6">Yeni bir rozet kazandın!</p>
              
              <div className="space-y-4 mb-8">
                {earnedBadges.map(badge => (
                  <div key={badge.id} className={`p-4 rounded-xl border-2 border-yellow-100 ${badge.color} bg-opacity-10 flex items-center gap-4 text-left`}>
                    <div className="text-3xl">{badge.icon}</div>
                    <div>
                      <h3 className="font-bold text-slate-800">{badge.name}</h3>
                      <p className="text-xs text-slate-500">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={closeBadgeModal}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
              >
                Harika! Raporu Göster
              </button>
           </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && reportData && !showBadgeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 p-6 text-center text-white relative">
               <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-emerald-100 hover:text-white">
                 <X size={24} />
               </button>
               <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                 <CheckCircle size={32} />
               </div>
               <h2 className="text-2xl font-bold">Harika İş Çıkardın! 🔥</h2>
               <p className="text-emerald-100 text-sm mt-1">Antrenman başarıyla tamamlandı.</p>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                   <span className="block text-xs font-bold text-slate-400 uppercase">Süre</span>
                   <span className="block text-xl font-bold text-slate-800">{Math.floor(reportData.duration / 60)} dk</span>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                   <span className="block text-xs font-bold text-slate-400 uppercase">Hareket</span>
                   <span className="block text-xl font-bold text-slate-800">{Object.keys(reportData.logs).length}</span>
                 </div>
               </div>

               {/* AI Analysis Box */}
               <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 relative">
                 <div className="absolute -top-3 left-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                   <Zap size={12} /> AI Koç Analizi
                 </div>
                 <div className="mt-2 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                   {reportData.analysis}
                 </div>
               </div>

               {/* Action Buttons */}
               <button 
                 onClick={() => {
                    // Social share logic (future feature)
                    alert("Yakında: Instagram hikayesinde paylaş!");
                 }}
                 className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
               >
                 <Share2 size={18} /> Başarını Paylaş
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-emerald-600 text-xl">
          <Dumbbell /> FitPortal
        </div>
        <div className="flex items-center gap-4">
           <NotificationBell />
           <span className="hidden md:block text-sm font-medium text-gray-600">{userProfile?.name}</span>
           <button onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
        </div>
      </header>

      {/* Layout */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 p-4 space-y-2">
          <button onClick={() => setActiveTab('home')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'home' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <Activity size={20} /> Kontrol Paneli
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'history' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <PieChart size={20} /> Geçmiş
          </button>
          <button onClick={() => setActiveTab('progress')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'progress' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <TrendingUp size={20} /> Gelişim Takibi
          </button>
          {userProfile.trainerId && (
             <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'chat' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
               <MessageSquare size={20} /> Eğitmenim
             </button>
          )}
          <button onClick={() => setActiveTab('marketplace')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'marketplace' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <Search size={20} /> Trainer Bul
          </button>
          <button onClick={() => setActiveTab('nutrition-ai')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'nutrition-ai' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <PieChart size={20} /> Beslenme Analizi
          </button>
          <button onClick={() => setActiveTab('ai-chat')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'ai-chat' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <Zap size={20} /> Pocket Coach (AI)
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
             <Activity size={20} /> Profilim
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          
          {activeTab === 'home' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Merhaba, {userProfile?.name}! 💪</h2>
                <p className="opacity-90">Bugünkü hedeflerine ulaşmak için harika bir gün.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Programs List */}
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardCheck size={20} className="text-emerald-600" />
                    Aktif Programlarım
                  </h3>
                  
                  {activePrograms.length > 0 ? (
                    activePrograms.map(program => {
                      // Determine days source (v2 blocks vs v1 days)
                      // Default to first block if blocks exist
                      const activeDays = program.blocks ? program.blocks[0].days : program.days;
                      const currentDayIndex = selectedDayIndices[program.id] || 0;
                      const currentDay = activeDays ? activeDays[currentDayIndex] : null;
                      const exerciseCount = currentDay?.exercises?.length || 0;

                      return (
                        <div key={program.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                             <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${program.type === 'nutrition' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {program.type === 'nutrition' ? <Activity size={20} /> : <Dumbbell size={20} />}
                               </div>
                               <div>
                                 <h4 className="font-bold text-slate-800">{program.title}</h4>
                                 {program.blocks && <span className="text-xs text-slate-500">Faz: {program.blocks[0].name}</span>}
                               </div>
                             </div>
                             <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">Aktif</span>
                          </div>
                          
                          <div className="p-6">
                             {program.type === 'nutrition' ? (
                               // Nutrition View
                               <div>
                                 <p className="text-sm text-slate-600 line-clamp-3 mb-4">{program.content}</p>
                                 <button 
                                   onClick={() => alert("Beslenme detayı yakında daha gelişmiş olacak!")}
                                   className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 transition"
                                 >
                                   Detayları Gör
                                 </button>
                               </div>
                             ) : (
                               // Workout View
                               <>
                                 <div className="mb-6">
                                   <p className="text-slate-500 text-sm mb-2">
                                     {exerciseCount} Hareket • {currentDay?.name || `Gün ${currentDayIndex+1}`}
                                   </p>
                                   
                                   {/* Day Selector */}
                                   {activeDays && activeDays.length > 0 && (
                                     <select 
                                       className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:border-emerald-500 outline-none"
                                       value={currentDayIndex}
                                       onChange={(e) => setSelectedDayIndices(prev => ({ ...prev, [program.id]: Number(e.target.value) }))}
                                     >
                                       {activeDays.map((day, idx) => (
                                         <option key={idx} value={idx}>{day.name || `Gün ${idx+1}`}</option>
                                       ))}
                                     </select>
                                   )}
                                 </div>
                                 
                                 <div className="flex gap-3">
                                    <button 
                                      onClick={() => setPreviewProgram({ ...program, days: activeDays, currentDayIndex })}
                                      className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                    >
                                      İncele
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setCurrentProgram({ ...program, days: activeDays, currentDayIndex });
                                        setIsWorkoutActive(true);
                                      }}
                                      className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                                    >
                                      <PlayCircle size={20} /> Başlat
                                    </button>
                                 </div>
                               </>
                             )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                      <p className="text-slate-500 mb-4">Bugün için atanmış bir programın yok.</p>
                      <button 
                        onClick={() => setActiveTab('marketplace')}
                        className="text-emerald-600 font-medium hover:underline"
                      >
                        Eğitmen Bul ve Programa Başla
                      </button>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-4">
                   {userProfile?.trainerId ? (
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                       <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-slate-800">Eğitmenin</h3>
                          <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded font-medium">Aktif</span>
                       </div>
                       
                       <button 
                         onClick={() => setShowCheckinModal(true)}
                         className="w-full mb-3 bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition"
                       >
                         <ClipboardCheck size={18} /> Haftalık Kontrol
                       </button>
                     </div>
                   ) : (
                     <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                       <h3 className="font-bold text-orange-800 mb-2">Henüz bir eğitmenin yok</h3>
                       <p className="text-sm text-orange-700 mb-4">Profesyonel destek almak için marketplace'e göz at.</p>
                       <button onClick={() => setActiveTab('marketplace')} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Eğitmen Bul</button>
                     </div>
                   )}
                   
                   {/* Ad Space */}
                   <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
                     REKLAM ALANI 2
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketplace' && <MarketplaceTab />}
          
          {activeTab === 'history' && <ActivityHistoryTab />}
          {activeTab === 'progress' && <ProgressTab />}
          {activeTab === 'chat' && (
             <ChatInterface 
                recipientId={userProfile.trainerId} 
                recipientName="Eğitmenin" 
                currentUserRole="member" 
             />
          )}
          {activeTab === 'nutrition-ai' && <div className="text-center text-slate-500 mt-10">Beslenme Analizi Yakında...</div>}
          {activeTab === 'ai-chat' && <div className="text-center text-slate-500 mt-10">AI Coach Yakında...</div>}
          {activeTab === 'profile' && <MemberProfileTab />}

        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden bg-white border-t border-gray-200 flex justify-around p-3 fixed bottom-0 w-full z-10">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Activity size={20} /> Ana Sayfa
        </button>
        <button onClick={() => setActiveTab('progress')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'progress' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <TrendingUp size={20} /> Gelişim
        </button>
        {userProfile.trainerId && (
           <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'chat' ? 'text-emerald-600' : 'text-gray-400'}`}>
             <MessageSquare size={20} /> Mesaj
           </button>
        )}
        <button onClick={() => setActiveTab('marketplace')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'marketplace' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Search size={20} /> Hoca Bul
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Activity size={20} /> Profil
        </button>
      </div>
    </div>
  );
}
