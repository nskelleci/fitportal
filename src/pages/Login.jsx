import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Dumbbell, Loader2, FlaskConical } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Test Users Configuration
  const testUsers = [
    { role: 'admin', name: 'System Admin', email: 'admin@test.com', pass: 'admin123' },
    { role: 'trainer', name: 'Ahmet Hoca', email: 'trainer@test.com', pass: 'trainer123' },
    { role: 'member', name: 'Mehmet Üye', email: 'member@test.com', pass: 'member123' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      alert("Giriş başarısız: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to create test users if they don't exist
  const createTestUser = async (user) => {
    setLoading(true);
    try {
      // 1. Try to Login first
      await signInWithEmailAndPassword(auth, user.email, user.pass);
      navigate("/"); // If success, redirect immediately
    } catch (loginError) {
      // 2. If user not found, create it
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        try {
          const { user: authUser } = await createUserWithEmailAndPassword(auth, user.email, user.pass);
          await createProfile(authUser, user);
          alert(`${user.role.toUpperCase()} oluşturuldu ve giriş yapılıyor...`);
          navigate("/");
        } catch (createError) {
           console.error("Create error:", createError);
           if (createError.code === 'auth/email-already-in-use') {
             // Fallback: Try to repair profile if it's missing
             try {
               // Sign in first
               const { user: existingUser } = await signInWithEmailAndPassword(auth, user.email, user.pass);
               // Check if profile exists
               const docRef = doc(db, "users", existingUser.uid);
               const docSnap = await getDoc(docRef); // Need to import getDoc
               
               if (!docSnap.exists()) {
                 console.log("Profil eksik, onarılıyor...");
                 await createProfile(existingUser, user);
                 alert("Kullanıcı vardı ama profili eksikti. Onarıldı ve giriş yapılıyor.");
                 navigate("/");
               } else {
                 setFormData({ email: user.email, password: user.pass });
                 alert("Kullanıcı zaten tam olarak mevcut. 'Giriş Yap' butonuna basınız.");
               }
             } catch (repairError) {
                console.error("Repair error", repairError);
                setFormData({ email: user.email, password: user.pass });
                alert("Kullanıcı var. Lütfen giriş yapınız.");
             }
           } else {
             alert("Hata: " + createError.message);
           }
        }
      } else {
        console.error("Login error:", loginError);
        alert("Giriş Hatası: " + loginError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (authUser, user) => {
    await updateProfile(authUser, { displayName: user.name });
    await setDoc(doc(db, "users", authUser.uid), {
      uid: authUser.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'active',
      createdAt: serverTimestamp(),
      ...(user.role === 'trainer' ? {
          specialization: 'Fitness Demo',
          experience: 5,
          bio: 'Test amaçlı oluşturulmuş demo eğitmen.',
          onboardingCompleted: true
      } : {})
    });
  };

  const fillCredentials = (user) => {
     setFormData({ email: user.email, password: user.pass });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-600 p-6 text-center">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <Dumbbell /> FitPortal
          </h1>
          <p className="text-emerald-100 mt-2">Tekrar Hoşgeldin!</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'İşleniyor...' : 'Giriş Yap'}
            </button>
          </form>

          {/* Test Tools */}
          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3">
               <FlaskConical size={14} /> Hızlı Test Araçları
             </div>
             <div className="grid grid-cols-3 gap-2">
               {testUsers.map((u) => (
                 <button 
                   key={u.role}
                   type="button"
                   onClick={() => createTestUser(u)}
                   className="text-xs py-2 px-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition flex flex-col items-center gap-1"
                   title="Kullanıcı yoksa oluşturur, varsa doldurur"
                 >
                   <span className="font-bold capitalize">{u.role}</span>
                   <span className="opacity-70 text-[10px]">Oluştur/Seç</span>
                 </button>
               ))}
             </div>
             <p className="text-[10px] text-slate-400 mt-2 text-center">
               Not: Butona bastığınızda kullanıcı yoksa veritabanında oluşturulur, varsa bilgileri forma doldurulur.
             </p>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            Hesabın yok mu? <Link to="/register" className="text-emerald-600 font-medium hover:underline">Hemen Kaydol</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
