import { ReadStream } from 'fs';
import { } from 'multer';

export interface UploadedFileResult {
  key: string;
  url: string;
}

export interface IStorageService {
  upload(file: Express.Multer.File): Promise<UploadedFileResult>;
  getFileStream(
    key: string,
    range?: { start: number; end: number },
  ): Promise<{ stream: ReadStream; mimeType: string; contentLength?: number }>;
  getFileSize(key: string): Promise<number>;
  delete(key: string): Promise<void>;
  saveFile(binary: string): Promise<string>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
