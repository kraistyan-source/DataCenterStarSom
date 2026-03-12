/**
 * Extracts a frame from a video file and returns it as a base64 data URL.
 * Seeks to 1 second (or 0 if shorter) to avoid black frames.
 */
export function extractVideoThumbnail(
  source: Blob | string,
  timeSeconds = 1,
  maxWidth = 400
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    let revoke = typeof source !== 'string';

    const cleanup = () => {
      if (revoke) URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration * 0.1 || 0);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail'));
    };

    // Timeout fallback
    setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail extraction timed out'));
    }, 10000);

    video.src = url;
  });
}
