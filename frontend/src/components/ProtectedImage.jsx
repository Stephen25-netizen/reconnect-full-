import { useEffect, useState } from 'react';

const API =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ProtectedImage({
  path,
  alt = 'Supporting proof image',
  className = '',
}) {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    if (!path) {
      setImageSrc('');
      return;
    }

    let objectUrl;
    let cancelled = false;
    const controller = new AbortController();

    async function loadImage() {
      try {
        // Existing public item photos continue to work.
        if (!path.startsWith('/private-uploads/')) {
          setImageSrc(
            `${API.replace(/\/api\/?$/, '')}${path}`
          );
          return;
        }

        const filename = path.split('/').pop();
        const token = localStorage.getItem('reconnect_token');

        if (!token) {
          setImageSrc('');
          return;
        }

        const response = await fetch(
          `${API}/claims/proof/${encodeURIComponent(filename)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Unable to load proof image.');
        }

        const blob = await response.blob();

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Proof image loading failed:', error);
        }

        if (!cancelled) {
          setImageSrc('');
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}