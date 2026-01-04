import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export const videoService = {
  /**
   * Get a direct upload URL for Cloudflare Stream
   * Calls a Firebase Callable Function 'getCloudflareUploadUrl'
   */
  getUploadUrl: async () => {
    try {
      // In development, we might mock this or it will fail if functions aren't deployed
      // const getUrl = httpsCallable(functions, 'getCloudflareUploadUrl');
      // const result = await getUrl();
      // return result.data.uploadUrl;

      // MOCK for now
      console.warn("Using MOCK upload URL. Implement Cloud Function.");
      return "https://upload.videodelivery.net/mock-upload-url";
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
  },

  /**
   * Upload video to Cloudflare Stream using the direct upload URL
   * @param {File} file 
   * @param {string} uploadUrl 
   * @param {Function} onProgress 
   */
  uploadVideo: async (file, uploadUrl, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          if (onProgress) onProgress(percentComplete);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Cloudflare Stream returns the video details in response
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Upload failed"));
          }
        }
      };

      const formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
    });
  }
};

