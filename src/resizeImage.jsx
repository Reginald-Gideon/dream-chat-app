// Resizes an image file down to a small square and returns a base64 data URL.
// Keeping it small (e.g. 128x128) means it stores cheaply in Postgres as text.
export function resizeImage(file, maxSize = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext("2d");

        // crop to a centered square, then scale down to maxSize x maxSize
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);

        resolve(canvas.toDataURL("image/jpeg", 0.8)); // 0.8 = compression quality
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}