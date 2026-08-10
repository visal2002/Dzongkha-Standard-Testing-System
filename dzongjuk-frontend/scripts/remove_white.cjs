const { Jimp } = require('jimp');

async function removeWhite() {
  try {
    const imagePath = 'public/images/logo of DCDD.jpg';
    const outputPath = 'public/images/logo of DCDD.png';
    
    console.log('Loading image...');
    const image = await Jimp.read(imagePath);
    
    // Set white (or near-white) pixels to transparent
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const color = Jimp.intToRGBA(image.getPixelColor(x, y));
        
        // Tolerance for "white" - you can adjust this if needed
        if (color.r > 230 && color.g > 230 && color.b > 230) {
          image.setPixelColor(Jimp.rgbaToInt(color.r, color.g, color.b, 0), x, y);
        }
      }
    }
    
    await image.write(outputPath);
    console.log('Successfully saved to ' + outputPath);
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

removeWhite();
