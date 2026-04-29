/**
 * Generated with Claude with following prompt:
 * When a test fails, it makes sure to say what specifically failed
If there is a file in assets/images that is not an image, fail
If there is an image above 6mb in assets/images, fail (might have to compress all the images manually in assets/images dir)
If there is an image with no metadata in image.ts (no obj has corresponding imgName), fail
If there is a metadata with incorrect/no imgName, fail
If there is a metadata where categories is not a list of strings or empty list, fail
If a metadata coordinate (long or lang) is not a valid coordinate (number, between range for coords), fail
If a metadata is not formatted as the following json, fail:
{
imgName: string,
Location: string,
Latitude: string,
Longitude: string,
Categories: string
}
Else pass
 */
import * as fs from 'fs-extra';
import * as path from 'path';

interface ImageMetadata {
  imgName: string;
  Location: string;
  Latitude: string;
  Longitude: string;
  Categories: string[];
}

describe('Asset and Metadata Validation', () => {
  const imagesDir = path.join(__dirname, '../images');
  const metadataPath = path.join(__dirname, '../metadata/images.json');
  const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024; // 6MB
  const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  const isValidCoordinate = (coord: any, min: number, max: number): boolean => {
    const val = parseFloat(coord);
    return !isNaN(val) && val >= min && val <= max;
  };

  // Load metadata from JSON file
  const imgConfig: ImageMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // Includes everything in the folder (including 10mb.txt)
  const imageFiles = fs.readdirSync(imagesDir);

  test('All files in assets/images must be valid image types', () => {
    const errors: string[] = [];
    imageFiles.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.includes(ext)) {
        errors.push(`Invalid file found: '${file}'. Only ${VALID_IMAGE_EXTENSIONS.join(', ')} are allowed.`);
      }
    });
    if (errors.length > 0) {
      throw new Error(`File Type Validation Failed:\n${errors.join('\n')}`);
    }
  });

  test('Metadata must match the required JSON structure and constraints', () => {
    const errors: string[] = [];
    imgConfig.forEach((meta: any, index) => {
      const identifier = meta.imgName || `Index ${index}`;
      const requiredKeys = ['imgName', 'Location', 'Latitude', 'Longitude', 'Categories'];
      requiredKeys.forEach(key => {
        if (!(key in meta)) {
          errors.push(`Metadata [${identifier}] is missing required key: ${key}`);
        }
      });

      if (meta.imgName && !imageFiles.includes(meta.imgName)) {
        errors.push(`Metadata [${identifier}]: File '${meta.imgName}' not found in assets/images (Check extensions!)`);
      }

      // Categories is now a real array, not a stringified one
      if (!Array.isArray(meta.Categories) || !meta.Categories.every((c: any) => typeof c === 'string')) {
        errors.push(`Metadata [${identifier}]: 'Categories' must be an array of strings (e.g. ["A", "B"])`);
      }

      if (!isValidCoordinate(meta.Latitude, -90, 90)) {
        errors.push(`Metadata [${identifier}]: Latitude '${meta.Latitude}' is out of range (-90 to 90)`);
      }
      if (!isValidCoordinate(meta.Longitude, -180, 180)) {
        errors.push(`Metadata [${identifier}]: Longitude '${meta.Longitude}' is out of range (-180 to 180)`);
      }
    });
    if (errors.length > 0) {
      throw new Error(`Metadata Validation Failed:\n${errors.join('\n')}`);
    }
  });

  test('File constraints (Size check)', () => {
    const errors: string[] = [];
    imageFiles.forEach(file => {
      const stats = fs.statSync(path.join(imagesDir, file));
      if (stats.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file} is over 6MB (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      }

      if (!imgConfig.find(m => m.imgName === file)) {
        errors.push(`Image '${file}' has no entry in images.json`);
      }
    });
    if (errors.length > 0) {
      throw new Error(`File Checks Failed:\n${errors.join('\n')}`);
    }
  });
});