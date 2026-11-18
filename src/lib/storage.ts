import fs from "fs";
import path from "path";

export interface UploadOptions {
  financialYear?: string;
  module: "cashbook" | "banking" | "vouchers" | "invoices" | "machines";
  filename: string;
  buffer: Buffer;
  contentType?: string;
}

export interface StorageService {
  uploadFile(options: UploadOptions): Promise<{ url: string; path: string }>;
  deleteFile(filePath: string): Promise<boolean>;
}

class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), "public", "uploads");
  }

  async uploadFile(options: UploadOptions): Promise<{ url: string; path: string }> {
    const fy = options.financialYear || "2026-27";
    const targetDir = path.join(this.baseDir, fy, options.module);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const cleanFilename = `${Date.now()}-${options.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const absolutePath = path.join(targetDir, cleanFilename);
    await fs.promises.writeFile(absolutePath, options.buffer);

    const publicUrl = `/uploads/${fy}/${options.module}/${cleanFilename}`;
    return {
      url: publicUrl,
      path: absolutePath,
    };
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

class R2StorageService implements StorageService {
  async uploadFile(options: UploadOptions): Promise<{ url: string; path: string }> {
    // Cloudflare R2 driver placeholder when R2 credentials are set
    console.log("[Storage] Cloudflare R2 Upload triggered for:", options.filename);
    const fy = options.financialYear || "2026-27";
    return {
      url: `https://${process.env.R2_PUBLIC_URL || "r2.standardroofs.in"}/${fy}/${options.module}/${options.filename}`,
      path: `r2://${fy}/${options.module}/${options.filename}`,
    };
  }

  async deleteFile(): Promise<boolean> {
    return true;
  }
}

export function getStorageService(): StorageService {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "r2" && process.env.R2_ACCOUNT_ID) {
    return new R2StorageService();
  }
  return new LocalStorageService();
}
