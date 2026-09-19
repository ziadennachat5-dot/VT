import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const sourceImage = 'C:\\Users\\Mac\\.gemini\\antigravity\\brain\\6c88d573-a27d-473c-a469-5000c481c6f2\\monogram_1789778286902.jpg';
  const outDir = path.join(__dirname, 'public');

  const image = await Jimp.read(sourceImage);
  
  const sizes = [16, 32, 48, 180, 192, 512];
  
  for (const size of sizes) {
    const resized = image.clone().resize({ w: size, h: size });
    let name = `icon-${size}.png`;
    if (size === 16 || size === 32) name = `favicon-${size}x${size}.png`;
    if (size === 180) name = 'apple-touch-icon.png';
    if (size === 48) name = 'favicon-48.png';
    
    await resized.write(path.join(outDir, name));
  }
}

generate().catch(console.error);
