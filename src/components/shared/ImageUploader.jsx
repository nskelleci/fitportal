import { useState } from "react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Upload, X, Loader2, CheckCircle } from "lucide-react";
import { app } from "../../lib/firebase"; // Make sure app is exported from firebase.js

const storage = getStorage(app);

export default function ImageUploader({ onUploadComplete, folder = "uploads" }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);

    // Upload automatically
    uploadFile(file);
  };

  const uploadFile = (file) => {
    setUploading(true);
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const prog = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(prog);
      },
      (err) => {
        console.error(err);
        setError("Yükleme başarısız.");
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setUploading(false);
          onUploadComplete(downloadURL);
        });
      }
    );
  };

  const clear = () => {
    setPreview(null);
    setProgress(0);
    setError(null);
  };

  if (preview) {
    return (
      <div className="relative w-full h-32 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
        <img src={preview} alt="Preview" className="h-full object-contain opacity-80" />
        
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
            <Loader2 className="animate-spin mb-1" />
            <span className="text-xs font-bold">{progress}%</span>
          </div>
        )}
        
        {!uploading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 text-emerald-600 font-bold">
             <CheckCircle className="mr-1" /> Yüklendi
          </div>
        )}

        <button 
          onClick={clear} 
          className="absolute top-1 right-1 bg-white text-slate-500 p-1 rounded-full shadow hover:text-red-500"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-slate-400" />
          <p className="text-sm text-slate-500"><span className="font-semibold">Yüklemek için tıkla</span></p>
          <p className="text-xs text-slate-400">PNG, JPG (Max. 2MB)</p>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

