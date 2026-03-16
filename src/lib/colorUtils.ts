export const normalizeToHex = (color: string): string => {
  if (!color) return '#000000';
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color.substring(0, 7);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#000000';
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  
  return '#' + 
    data[0].toString(16).padStart(2, '0') + 
    data[1].toString(16).padStart(2, '0') + 
    data[2].toString(16).padStart(2, '0');
};

export const getRgbDistance = (c1: string, c2: string): number => {
  const hex1 = normalizeToHex(c1);
  const hex2 = normalizeToHex(c2);
  
  const r1 = parseInt(hex1.slice(1, 3), 16) / 255;
  const g1 = parseInt(hex1.slice(3, 5), 16) / 255;
  const b1 = parseInt(hex1.slice(5, 7), 16) / 255;
  
  const r2 = parseInt(hex2.slice(1, 3), 16) / 255;
  const g2 = parseInt(hex2.slice(3, 5), 16) / 255;
  const b2 = parseInt(hex2.slice(5, 7), 16) / 255;
  
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + 
    Math.pow(g1 - g2, 2) + 
    Math.pow(b1 - b2, 2)
  );
};

export const getComputedFinalColor = (elementId: string): string => {
  const el = document.getElementById(elementId);
  if (!el) return '#000000';
  const style = window.getComputedStyle(el);
  return normalizeToHex(style.color);
};
