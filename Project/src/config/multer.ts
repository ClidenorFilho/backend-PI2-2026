// src/config/multer.ts
// ─────────────────────────────────────────────────────────────────
// Configuração do Multer para upload de arquivos (Plantas/Documentos).
// Aceita apenas arquivos PDF com limite de 5MB.
// Salva temporariamente em pasta uploads/
// ─────────────────────────────────────────────────────────────────

import multer, { StorageEngine, FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ── Configuração de armazenagem ───────────────────────────────────

const uploadDir = path.join(process.cwd(), "uploads");

// Criar pasta de uploads se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Gerar nome único: timestamp + nome original
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// ── Filtro de tipos de arquivo ────────────────────────────────────

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Aceitar apenas PDF
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos PDF são aceitos."));
  }
};

// ── Configuração do Multer ────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB em bytes
  },
});

export default upload;
