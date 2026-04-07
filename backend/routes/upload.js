/**
 * Image Upload Route – Multer-based file upload
 * 
 * POST /api/upload/image – Upload a book image
 */
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = Router();

/** POST /api/upload/image */
router.post("/image", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const url = req.file.path;

  res.json({ url });
});

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Image must be less than 5MB" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Upload failed" });
});

export default router;
