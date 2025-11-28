import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseUploadPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(baseUploadPath)) {
  fs.mkdirSync(baseUploadPath, { recursive: true });
  console.log("📁 Created base uploads folder");
}


export const makeUploader = (folderName) => {
  const safeFolder = path.normalize(folderName).replace(/^(\.\.[/\\])+/, "");
  const uploadPath = path.join(baseUploadPath, safeFolder);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`📁 Created subfolder: ${uploadPath}`);
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    },
  });

  return multer({ storage });
};
