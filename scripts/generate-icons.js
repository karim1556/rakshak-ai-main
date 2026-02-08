const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const r = Math.round(size * 0.2);
  const p = Math.round(size * 0.2);
  const s = size - p * 2;
  const cx = size / 2;
  const cy = size / 2;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#4f46e5"/>
  <g transform="translate(${cx - s/2}, ${cy - s/2})">
    <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="M12 8v4"/>
      <path d="M10 12h4"/>
    </svg>
  </g>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

// Also create apple-touch-icon
const appleSize = 180;
const ar = Math.round(appleSize * 0.2);
const ap = Math.round(appleSize * 0.2);
const as2 = appleSize - ap * 2;
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${appleSize}" height="${appleSize}" viewBox="0 0 ${appleSize} ${appleSize}">
  <rect width="${appleSize}" height="${appleSize}" rx="${ar}" fill="#4f46e5"/>
  <g transform="translate(${appleSize/2 - as2/2}, ${appleSize/2 - as2/2})">
    <svg width="${as2}" height="${as2}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="M12 8v4"/>
      <path d="M10 12h4"/>
    </svg>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
console.log('Created apple-touch-icon.svg');

console.log('All icons created!');
