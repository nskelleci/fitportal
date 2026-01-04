import { useState, useEffect } from "react";
import { Plus, Trash2, Zap, Check, X, MessageSquare, Bell, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { automationService } from "../../services/automationService";

export default function AutomationTab() {
  const { currentUser } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Rule State
  const [newRule, setNewRule] = useState({
    title: "",
    triggerType: "program_assigned", // program_assigned, workout_completed, checkin_missed
    actionType: "send_notification", // send_notification, send_message, award_badge
    messageTemplate: "Merhaba {name}, yeni programın hazır! Başarılar. 💪"
  });

  useEffect(() => {
    if (currentUser) {
      fetchRules();
    }
  }, [currentUser]);

  const fetchRules = async () => {
    try {
      const data = await automationService.getTrainerRules(currentUser.uid);
      setRules(data);
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.title || !newRule.messageTemplate) return alert("Lütfen tüm alanları doldurun.");
    
    try {
      await automationService.createRule({
        ...newRule,
        trainerId: currentUser.uid
      });
      setShowModal(false);
      fetchRules();
      alert("Otomasyon kuralı oluşturuldu.");
    } catch (error) {
      console.error("Error creating rule:", error);
      alert("Hata oluştu.");
    }
  };

  const handleToggleRule = async (id, currentStatus) => {
    try {
      await automationService.toggleRule(id, !currentStatus);
      setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
    } catch (error) {
      console.error("Error toggling rule:", error);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm("Bu kuralı silmek istediğine emin misin?")) return;
    try {
      await automationService.deleteRule(id);
      setRules(rules.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="text-amber-500" /> AutoFlow Otomasyon
          </h1>
          <p className="text-slate-500 mt-1">Tekrarlayan işlerini otomatiğe bağla, zaman kazan.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition"
        >
          <Plus size={20} /> Yeni Kural
        </button>
      </div>

      {/* Rule List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
      ) : rules.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Zap size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Henüz Otomasyon Yok</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Örn: "Program atandığında hoş geldin mesajı at" veya "Antrenman bitince tebrik et".
          </p>
          <button 
            onClick={() => setShowModal(true)}
            className="text-emerald-600 font-bold hover:underline"
          >
            İlk kuralını oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between transition ${rule.isActive ? 'border-slate-200' : 'border-slate-100 opacity-75 bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${rule.isActive ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{rule.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-xs">
                      Eğer: {rule.triggerType}
                    </span>
                    <span>→</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-xs">
                      Yap: {rule.actionType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 italic">"{rule.messageTemplate}"</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleToggleRule(rule.id, rule.isActive)}
                  className={`transition ${rule.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                  title={rule.isActive ? "Devre Dışı Bırak" : "Aktifleştir"}
                >
                  {rule.isActive ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                </button>
                <button 
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-slate-300 hover:text-red-500 transition p-2"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Zap size={20} className="text-amber-500" /> Yeni Otomasyon
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kural Adı</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  placeholder="Örn: Yeni Program Bildirimi"
                  value={newRule.title}
                  onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tetikleyici (If This)</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                    value={newRule.triggerType}
                    onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })}
                  >
                    <option value="program_assigned">Program Atandığında</option>
                    <option value="workout_completed">Antrenman Bittiğinde</option>
                    <option value="checkin_submitted">Check-in Yapıldığında</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aksiyon (Then That)</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                    value={newRule.actionType}
                    onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                  >
                    <option value="send_notification">Bildirim Gönder</option>
                    <option value="send_message">Mesaj Gönder (Chat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mesaj Şablonu</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-sm"
                  rows="3"
                  placeholder="Mesaj içeriği... {name} değişkenini kullanabilirsin."
                  value={newRule.messageTemplate}
                  onChange={(e) => setNewRule({ ...newRule, messageTemplate: e.target.value })}
                ></textarea>
                <p className="text-xs text-slate-400 mt-1">Kullanılabilir değişkenler: {'{name}'}</p>
              </div>

              <button 
                onClick={handleCreateRule}
                className="w-full bg-amber-500 text-white py-3 rounded-lg font-bold hover:bg-amber-600 transition shadow-lg shadow-amber-100"
              >
                Kuralı Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

