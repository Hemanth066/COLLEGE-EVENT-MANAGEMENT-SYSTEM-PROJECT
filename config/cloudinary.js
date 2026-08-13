const cloudinary = require("cloudinary").v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'r1sdgb18';
const apiKey = process.env.CLOUDINARY_API_KEY || '412331426765134';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'kelHOPPWqf3qqv_rbu2HSI0J-bg';

console.log("Cloud Name:", cloudName);
console.log("API Key:", apiKey);
console.log("API Secret:", apiSecret ? "Loaded" : "Not Loaded");

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

module.exports = cloudinary;