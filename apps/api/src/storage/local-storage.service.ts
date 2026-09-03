import { BadRequestException, Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { basename, extname, join, resolve, sep } from 'path';
import { v4 as uuid } from 'uuid';
import { IStorageService, UploadedFileResult } from './storage.interface';

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir = resolve(join(process.cwd(), 'uploads/tracks'));

  /**
   * `key` ultimately traces back to client input (a multipart filename, or -
   * for delete() - a DB column populated from a previous upload's key)
   * that's never guaranteed to be a plain filename. basename() strips any
   * directory components up front, and re-resolving + prefix-checking here
   * closes the case a crafted key still smuggles a traversal past that
   * (e.g. via `..` segments introduced elsewhere in the join). Without this,
   * `key = "../../../../etc/cron.d/evil"` would let upload()/delete() write
   * or unlink arbitrary files outside uploadDir.
   */
  private resolveSafePath(key: string): string {
    const resolved = resolve(this.uploadDir, basename(key));
    if (resolved !== this.uploadDir && !resolved.startsWith(this.uploadDir + sep)) {
      throw new BadRequestException('Invalid file path');
    }
    return resolved;
  }

  async saveFile(binary: string) {
    await mkdir(this.uploadDir, { recursive: true });
    const key = `${uuid()}.mp3`;
    const buffer = Buffer.from(binary, 'base64');
    await writeFile(this.resolveSafePath(key), buffer);
    return key
  }

  async upload(file: Express.Multer.File): Promise<UploadedFileResult> {
    await mkdir(this.uploadDir, { recursive: true });
    // busboy decodes the multipart filename field as latin1 regardless of
    // the browser's actual (UTF-8) encoding - every non-ASCII originalname
    // (accents, Arabic, CJK, ...) arrives mojibake'd unless re-decoded here.
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const key = `${uuid()}-${basename(originalName)}`;
    await writeFile(this.resolveSafePath(key), file.buffer);
    return { key, url: `/files/${key}` };
  }

  async getFileSize(key: string): Promise<number> {
    const stats = await stat(this.resolveSafePath(key));
    return stats.size;
  }

  async getFileStream(key: string, range?: { start: number; end: number }) {
    const path = this.resolveSafePath(key);
    return {
      stream: range
        ? createReadStream(path, { start: range.start, end: range.end })
        : createReadStream(path),
      mimeType: AUDIO_MIME_TYPES[extname(key).toLowerCase()] ?? 'audio/mpeg',
    };
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolveSafePath(key));
  }
}
