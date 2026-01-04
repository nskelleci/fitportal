import { useState, useEffect } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    // Realtime listener for notifications
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side
      notifs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(notifs.slice(0, 20)); // Limit to 20
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        const ref = doc(db, "notifications", n.id);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  };

  const deleteNotification = async (id) => {
    await deleteDoc(doc(db, "notifications", id));
  };

  // Close dropdown when clicking outside (simple implementation)
  useEffect(() => {
    const handleClickOutside = (e) => {
        if (isOpen && !e.target.closest('.notification-container')) {
            setIsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative notification-container">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-800">Bildirimler</h3>
             {unreadCount > 0 && (
               <button onClick={markAllAsRead} className="text-xs text-emerald-600 font-medium hover:underline">
                 Tümünü Okundu Say
               </button>
             )}
           </div>

           <div className="max-h-80 overflow-y-auto">
             {notifications.length === 0 ? (
               <div className="p-8 text-center text-slate-400">
                 <Bell size={24} className="mx-auto mb-2 opacity-20" />
                 <p className="text-sm">Henüz bildirim yok.</p>
               </div>
             ) : (
               <div className="divide-y divide-slate-100">
                 {notifications.map(notif => (
                   <div key={notif.id} className={`p-4 hover:bg-slate-50 transition flex gap-3 ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800 leading-snug">{notif.message}</p>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'Az önce'}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                        className="text-slate-300 hover:text-red-500 self-start"
                      >
                        <X size={14} />
                      </button>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}

