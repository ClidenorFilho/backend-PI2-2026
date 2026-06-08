// src/config/multer.ts
// ─────────────────────────────────────────────────────────────────
// Configuração do Multer para upload de arquivos.
// Mantém o fluxo de documentos em PDF e adiciona o fluxo de alterações
// com múltiplos arquivos locais em uploads/.
// ─────────────────────────────────────────────────────────────────

import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { randomUUID } from "crypto";

// ── Configuração de armazenagem ───────────────────────────────────

const uploadDir = path.join(process.cwd(), "uploads");

const ensureDirectory = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectory(uploadDir);

const buildUniqueFilename = (file: Express.Multer.File): string => {
  const originalName = path.basename(file.originalname);
  const extension = path.extname(originalName);
  const baseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const safeBaseName = baseName || "arquivo";
  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  return `${safeBaseName}-${uniqueSuffix}${extension}`;
};

const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    cb(null, buildUniqueFilename(file));
  },
});

const alterationStorage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, file: Express.Multer.File, cb) => {
    const alterationDir = path.join(uploadDir, "alteracoes");
    const fieldDir = path.join(alterationDir, file.fieldname);
    ensureDirectory(fieldDir);
    cb(null, fieldDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    cb(null, buildUniqueFilename(file));
  },
});

// ── Filtro de tipos de arquivo ────────────────────────────────────

const documentFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    const err: any = new Error("Apenas arquivos PDF são aceitos.");
    err.code = "INVALID_FILE_TYPE";
    cb(err);
  }
};

const alterationFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
  const allowedPlantaTypes = ["application/pdf", ...allowedImageTypes];

  if (file.fieldname === "fotos" && allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  if (file.fieldname === "planta" && allowedPlantaTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  const err: any = new Error(
    file.fieldname === "fotos"
      ? "No campo 'fotos', envie apenas imagens (JPEG, PNG, WEBP, GIF ou HEIC)."
      : "No campo 'planta', envie um PDF ou uma imagem válida."
  );
  err.code = "INVALID_FILE_TYPE";
  cb(err);
};

// ── Configuração do Multer ────────────────────────────────────────

const uploadDocument = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB em bytes
  },
});

export const uploadAlteration = multer({
  storage: alterationStorage,
  fileFilter: alterationFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
});

export default uploadDocument;
