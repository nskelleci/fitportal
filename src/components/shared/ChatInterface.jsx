import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, app } from "../../lib/firebase"; // Import app for Storage
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, updateDoc, doc, getDoc, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Send, Image, MoreVertical, Phone, Video, Loader2 } from "lucide-react";

const storage = getStorage(app);

export default function ChatInterface({ recipientId, recipientName, currentUserRole }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Find or Create Chat ID
  useEffect(() => {
    if (!currentUser || !recipientId) return;

    const fetchChat = async () => {
      const uids = [currentUser.uid, recipientId].sort();
      const generatedChatId = `${uids[0]}_${uids[1]}`;
      setChatId(generatedChatId);

      // Check if doc exists, if not create placeholder
      const chatRef = doc(db, "chats", generatedChatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await import("firebase/firestore").then(({ setDoc }) => {
           setDoc(chatRef, {
             participants: uids,
             createdAt: serverTimestamp(),
             lastMessage: "Sohbet başlatıldı.",
             lastMessageAt: serverTimestamp()
           });
        });
      }
      setLoading(false);
    };

    fetchChat();
  }, [currentUser, recipientId]);

  // 2. Subscribe to Messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e) => {
    e && e.preventDefault();
    if ((!newMessage.trim()) || !chatId) return;

    try {
      const text = newMessage.trim();
      setNewMessage(""); // Optimistic clear

      // Add message
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
        type: 'text'
      });

      // Update chat metadata
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${recipientId}`]: 1 
      });

    } catch (error) {
      console.error("Send error:", error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;
    
    setIsUploading(true);
    const storageRef = ref(storage, `chat_images/${chatId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {},
      (err) => {
        console.error(err);
        setIsUploading(false);
        alert("Resim yüklenemedi.");
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
           setIsUploading(false);
           // Send Image Message
           await addDoc(collection(db, "chats", chatId, "messages"), {
             text: "📷 Fotoğraf",
             imageUrl: downloadURL,
             senderId: currentUser.uid,
             createdAt: serverTimestamp(),
             type: 'image'
           });
           // Update chat metadata
           await updateDoc(doc(db, "chats", chatId), {
             lastMessage: "📷 Fotoğraf",
             lastMessageAt: serverTimestamp(),
             [`unreadCount.${recipientId}`]: 1 
           });
        });
      }
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400">Sohbet yükleniyor...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
            {recipientName?.[0]}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{recipientName}</h3>
            <span className="text-xs text-green-500 flex items-center gap-1">● Çevrimiçi</span>
          </div>
        </div>
        <div className="flex gap-3 text-slate-400">
          <button className="hover:text-emerald-600"><Phone size={20} /></button>
          <button className="hover:text-emerald-600"><Video size={20} /></button>
          <button className="hover:text-emerald-600"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl p-3 ${
                isMe 
                ? "bg-emerald-600 text-white rounded-tr-none" 
                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
              }`}>
                {msg.type === 'image' ? (
                  <img src={msg.imageUrl} alt="Sent" className="rounded-lg max-w-full mb-1" />
                ) : (
                  <p className="text-sm">{msg.text}</p>
                )}
                <span className={`text-[10px] block text-right mt-1 ${isMe ? "text-emerald-200" : "text-slate-400"}`}>
                  {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-slate-200 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="relative group">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"
            >
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Image size={20} />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageSelect} 
            />
          </div>
          
          <input 
            type="text" 
            className="flex-1 bg-slate-100 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Mesaj yaz..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
