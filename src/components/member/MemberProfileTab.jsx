import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Camera, User, Calendar, Heart, MessageSquare, Trash2, Edit2, Save, X, Award } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BADGES } from "../../lib/gamification";
import ImageUploader from "../shared/ImageUploader";

export default function MemberProfileTab() {
  const { userProfile, currentUser } = useAuth();
  const [posts, setPosts] = useState(userProfile?.posts || []);
  const [userBadges, setUserBadges] = useState([]);

  // Post States
  const [newPostUrl, setNewPostUrl] = useState("");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);

  // Profile Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    photoURL: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setPosts(userProfile.posts || []);
      setEditForm({
        name: userProfile.name || "",
        bio: userProfile.bio || "",
        photoURL: userProfile.photoURL || ""
      });

      // Map badge IDs to full badge objects
      if (userProfile.badges) {
        const badges = userProfile.badges
          .map(id => Object.values(BADGES).find(b => b.id === id))
          .filter(Boolean);
        setUserBadges(badges);
      }
    }
  }, [userProfile]);

  const handleImageUpload = (url) => {
    setNewPostUrl(url);
  };

  // Profile Picture Upload Handler
  const handleProfilePicUpload = (url) => {
    setEditForm(prev => ({ ...prev, photoURL: url }));
  };

  const handleSharePost = async () => {
    if (!newPostUrl) return;

    const newPost = {
      id: Date.now(),
      url: newPostUrl,
      caption: newPostCaption,
      likes: 0,
      createdAt: new Date().toISOString(),
      comments: []
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);

    await updateDoc(doc(db, "users", currentUser.uid), {
      posts: updatedPosts
    });

    setShowPostModal(false);
    setNewPostUrl("");
    setNewPostCaption("");
  };

  const handleDeletePost = async (postId) => {
    if(!confirm("Bu gönderiyi silmek istiyor musunuz?")) return;
    const updatedPosts = posts.filter(p => p.id !== postId);
    setPosts(updatedPosts);
    await updateDoc(doc(db, "users", currentUser.uid), {
      posts: updatedPosts
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: editForm.name,
        bio: editForm.bio,
        photoURL: editForm.photoURL
      });
      setShowEditModal(false);
      alert("Profil güncellendi!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Güncelleme başarısız.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 mb-4 gap-4">
             <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg relative group">
               {userProfile?.photoURL ? (
                 <img src={userProfile.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                   <User size={40} />
                 </div>
               )}
             </div>
             <div className="flex-1 text-center md:text-left">
               <h2 className="text-2xl font-bold text-slate-800">{userProfile?.name}</h2>
               {userProfile?.bio && <p className="text-slate-600 text-sm mt-1">{userProfile.bio}</p>}
               <p className="text-slate-500 text-xs flex items-center justify-center md:justify-start gap-1 mt-2">
                 <Calendar size={12} /> Üyelik: {userProfile?.createdAt?.seconds ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
               </p>
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={() => setShowEditModal(true)}
                 className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition flex items-center gap-2"
               >
                 <Edit2 size={16} /> Düzenle
               </button>
               <button 
                 onClick={() => setShowPostModal(true)}
                 className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2 shadow-emerald-200 shadow-sm"
               >
                 <Camera size={18} /> Fotoğraf Paylaş
               </button>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-center">
             <div>
               <span className="block font-bold text-xl text-slate-800">{posts.length}</span>
               <span className="text-xs text-slate-500 uppercase">Gönderi</span>
             </div>
             <div>
               <span className="block font-bold text-xl text-slate-800">0</span>
               <span className="text-xs text-slate-500 uppercase">Takipçi</span>
             </div>
             <div>
               <span className="block font-bold text-xl text-slate-800">{userBadges.length}</span>
               <span className="text-xs text-slate-500 uppercase">Rozet</span>
             </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
           <Award className="text-yellow-500" /> Rozet Koleksiyonu
        </h3>
        
        {userBadges.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Henüz rozet kazanılmamış. Antrenman yapmaya başla! 🚀</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userBadges.map(badge => (
              <div key={badge.id} className={`p-3 rounded-xl border ${badge.color} bg-opacity-10 flex flex-col items-center text-center gap-2 transition hover:scale-105`}>
                 <div className="text-3xl">{badge.icon}</div>
                 <div>
                   <h4 className="font-bold text-sm text-slate-800">{badge.name}</h4>
                   <p className="text-[10px] opacity-70 leading-tight">{badge.description}</p>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feed / Grid */}
      <div className="space-y-4">
         <h3 className="font-bold text-slate-800 text-lg">Paylaşımlar</h3>
         
         {posts.length === 0 ? (
           <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-200">
             <Camera className="mx-auto text-slate-300 mb-3" size={48} />
             <h4 className="text-slate-600 font-medium">Henüz gönderi yok</h4>
             <p className="text-slate-400 text-sm mt-1">Gelişimini paylaşmaya başla!</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {posts.map(post => (
               <div key={post.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
                 <div className="aspect-square bg-slate-100 relative">
                   <img src={post.url} alt="Post" className="w-full h-full object-cover" />
                   <button 
                     onClick={() => handleDeletePost(post.id)}
                     className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                   >
                     <Trash2 size={14} />
                   </button>
                 </div>
                 <div className="p-4">
                   <p className="text-slate-800 text-sm mb-3">{post.caption}</p>
                   <div className="flex items-center gap-4 text-slate-400 text-sm">
                     <button className="flex items-center gap-1 hover:text-red-500 transition"><Heart size={18} /> {post.likes}</button>
                     <button className="flex items-center gap-1 hover:text-blue-500 transition"><MessageSquare size={18} /> {post.comments.length}</button>
                     <span className="ml-auto text-xs">{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Yeni Gönderi</h3>
            <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Fotoğraf Yükle</label>
                 {newPostUrl ? (
                   <div className="relative">
                     <img src={newPostUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                     <button 
                       onClick={() => setNewPostUrl("")}
                       className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 ) : (
                   <ImageUploader onUploadComplete={handleImageUpload} folder={`members/${currentUser.uid}/posts`} />
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                 <textarea 
                   rows="3"
                   placeholder="Bugünkü antrenman harikaydı..."
                   className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                   value={newPostCaption}
                   onChange={(e) => setNewPostCaption(e.target.value)}
                 ></textarea>
               </div>
               <div className="flex justify-end gap-3">
                 <button onClick={() => setShowPostModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">İptal</button>
                 <button onClick={handleSharePost} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Paylaş</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Profili Düzenle</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {/* Profile Photo Upload */}
                <div className="flex flex-col items-center gap-3 mb-6">
                   <div className="w-24 h-24 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                     {editForm.photoURL ? (
                       <img src={editForm.photoURL} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex items-center justify-center h-full text-slate-300">
                         <User size={32} />
                       </div>
                     )}
                   </div>
                   <div className="w-full">
                     <label className="block text-xs font-bold text-slate-500 text-center mb-2 uppercase">Profil Fotoğrafı</label>
                     <ImageUploader onUploadComplete={handleProfilePicUpload} folder={`members/${currentUser.uid}/profile`} />
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hakkımda (Bio)</label>
                  <textarea 
                    rows="3"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    placeholder="Kendinden bahset..."
                  ></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 font-medium"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={18} /> Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
