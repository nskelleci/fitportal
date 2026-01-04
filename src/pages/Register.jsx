import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Dumbbell, User, Activity, Loader2 } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("member");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Auth User
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // 2. Update Display Name
      await updateProfile(user, { displayName: formData.name });

      // 3. Create Firestore Profile
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        role: role,
        createdAt: serverTimestamp(),
        status: role === 'trainer' ? 'pending' : 'active' // Trainers need approval
      });

      // 4. Redirect
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-600 p-6 text-center">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <Dumbbell /> FitPortal
          </h1>
          <p className="text-emerald-100 mt-2">Kayıt Ol ve Harekete Geç</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hesap Türü</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`border-2 rounded-xl p-3 flex flex-col items-center cursor-pointer transition ${role === 'member' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  <input type="radio" name="role" className="hidden" checked={role === 'member'} onChange={() => setRole('member')} />
                  <User className={role === 'member' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={`mt-1 text-sm font-medium ${role === 'member' ? 'text-emerald-900' : 'text-slate-500'}`}>Sporcu Üye</span>
                </label>
                <label className={`border-2 rounded-xl p-3 flex flex-col items-center cursor-pointer transition ${role === 'trainer' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  <input type="radio" name="role" className="hidden" checked={role === 'trainer'} onChange={() => setRole('trainer')} />
                  <Activity className={role === 'trainer' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={`mt-1 text-sm font-medium ${role === 'trainer' ? 'text-emerald-900' : 'text-slate-500'}`}>Trainer</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Kayıt Yapılıyor...' : 'Hesap Oluştur'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Zaten hesabın var mı? <Link to="/login" className="text-emerald-600 font-medium hover:underline">Giriş Yap</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

