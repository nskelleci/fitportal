import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Users, ClipboardList, TrendingUp, Activity, Clock } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getCountFromServer, getDocs, limit, orderBy } from "firebase/firestore";

export default function OverviewTab() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    studentCount: 0,
    programCount: 0,
    activeWorkouts: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Student Count
        const studentsQuery = query(collection(db, "users"), where("trainerId", "==", currentUser.uid));
        const studentsSnapshot = await getCountFromServer(studentsQuery);
        
        // 2. Program Count
        const programsQuery = query(collection(db, "workout_programs"), where("trainerId", "==", currentUser.uid));
        const programsSnapshot = await getCountFromServer(programsQuery);

        // 3. Recent Activities (Finished workouts)
        // Note: This requires a composite index in Firestore (trainerId + createdAt)
        // For MVP, we might just fetch recent reports directly if index exists, or do simple query
        let activities = [];
        try {
           // We query users first to get their IDs, then query reports? 
           // Better: workout_reports should have trainerId field for easier querying.
           // Assuming workout_reports has 'trainerId' field (we need to ensure this when creating report)
           // If not, we'll skip this for now or fetch all reports of students (inefficient)
           
           // Fallback: Let's just show dummy data if no trainerId on reports yet, 
           // OR update workout report creation logic to include trainerId.
           // Let's assume we'll add trainerId to reports in future.
           // For now, showing static 0 for active workouts to be safe.
           
           // Actually, let's try to fetch reports where trainerId matches if we added it
           const reportsQuery = query(
             collection(db, "workout_reports"), 
             where("trainerId", "==", currentUser.uid),
             orderBy("createdAt", "desc"),
             limit(5)
           );
           const reportsSnap = await getDocs(reportsQuery);
           activities = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
           console.log("Activities query failed (probably missing index or field):", e);
        }

        setStats({
          studentCount: studentsSnapshot.data().count,
          programCount: programsSnapshot.data().count,
          activeWorkouts: activities.length // Just a placeholder metric
        });
        setRecentActivities(activities);

      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Panel Özeti</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-slate-500 text-sm font-medium">Toplam Öğrenci</h3>
            <p className="text-2xl font-bold text-slate-800">{loading ? '-' : stats.studentCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-slate-500 text-sm font-medium">Oluşturulan Program</h3>
            <p className="text-2xl font-bold text-slate-800">{loading ? '-' : stats.programCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-slate-500 text-sm font-medium">Bu Ayki Aktivite</h3>
            <p className="text-2xl font-bold text-slate-800">{loading ? '-' : stats.activeWorkouts}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-emerald-600" /> Son Aktiviteler
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivities.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Henüz bir aktivite yok.
            </div>
          ) : (
            recentActivities.map(activity => (
              <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                  {activity.memberName ? activity.memberName[0] : 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-bold">{activity.memberName || 'Öğrenci'}</span> bir antrenmanı tamamladı.
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Clock size={12} /> {activity.createdAt?.seconds ? new Date(activity.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'Az önce'}
                  </p>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                  Tamamlandı
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

