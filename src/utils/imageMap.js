// These imports expect an 'assets' folder inside the 'src' directory.
// Your project structure should look like: src/assets/nft1.png
// Temporarily using nft3.png for missing images to fix module not found errors
import nft1 from '../assets/nft3.png';
import nft2 from '../assets/nft3.png';
import nft3 from '../assets/nft3.png';
import placeholder from '../assets/nft3.png';

const imageMap = {
  'IMG1': nft1,
  'IMG2': nft2,
  'IMG3': nft3,
};

/**
 * Gets the corresponding image for a given ID.
 * Returns a placeholder if the ID is not found.
 * @param {string} id - The image ID (e.g., 'IMG1').
 * @returns The imported image asset.
 */
export const getImageById = (id) => {
  return imageMap[id.toUpperCase()] || placeholder;
};

/**
 * Returns an array of valid image IDs.
 * @returns {string[]}
 */
export const getValidImageIds = () => Object.keys(imageMap);