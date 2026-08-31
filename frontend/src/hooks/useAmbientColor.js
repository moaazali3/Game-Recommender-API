import { useState, useEffect } from 'react';

/**
 * Hook to extract dominant hue from an image url using canvas sampling
 * with graceful fallback to deep obsidian amber theme
 */
export const useAmbientColor = (imageUrl) => {
  const [ambientGlow, setAmbientGlow] = useState('rgba(244, 63, 94, 0.15)');

  useEffect(() => {
    if (!imageUrl) {
      setAmbientGlow('rgba(244, 63, 94, 0.15)');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);

        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          // Skip ultra-dark / ultra-bright washed pixels
          const brightness = (red + green + blue) / 3;
          if (brightness > 30 && brightness < 220) {
            r += red;
            g += green;
            b += blue;
            count++;
          }
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          setAmbientGlow(`rgba(${r}, ${g}, ${b}, 0.25)`);
        }
      } catch {
        // Fallback for CORS restricted images
        setAmbientGlow('rgba(244, 63, 94, 0.18)');
      }
    };

    img.onerror = () => {
      setAmbientGlow('rgba(244, 63, 94, 0.15)');
    };
  }, [imageUrl]);

  return ambientGlow;
};
