/**
 * Client-Side Image Optimizer and Server Uploader
 * 
 * Automatically compresses large camera and high-res photos to lightweight web-optimized formats,
 * drastically reducing payload size (from 10MB down to ~80KB) and uploading to server static storage.
 */

export async function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    let src = "";
    if (typeof fileOrDataUrl === "string") {
      src = fileOrDataUrl;
    } else {
      src = URL.createObjectURL(fileOrDataUrl);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (typeof fileOrDataUrl !== "string") {
        URL.revokeObjectURL(src);
      }

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      try {
        // Prefer WebP with fallback to JPEG
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl || dataUrl.startsWith("data:,")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      } catch (err) {
        console.warn("Canvas compression fallback:", err);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      }
    };

    img.onerror = (err) => {
      if (typeof fileOrDataUrl !== "string") {
        URL.revokeObjectURL(src);
      }
      reject(err);
    };

    img.src = src;
  });
}

/**
 * Uploads an image (File or dataUrl) to the Express /api/upload endpoint
 */
export async function uploadImageToServer(
  fileOrDataUrl: File | Blob | string
): Promise<string> {
  try {
    // 1. First compress in browser
    const compressedDataUrl = await compressImage(fileOrDataUrl);

    // 2. Upload to server endpoint
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataUrl: compressedDataUrl }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        return data.url;
      }
    }
    
    // If backend upload wasn't successful, return compressed base64 dataUrl (which is very small ~70KB)
    return compressedDataUrl;
  } catch (err) {
    console.warn("Server upload fallback to compressed base64:", err);
    try {
      return await compressImage(fileOrDataUrl);
    } catch {
      return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
    }
  }
}
