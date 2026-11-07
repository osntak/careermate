/**
 * Profile photo store. The image is a plain file in the data dir (uploads/), the
 * profile row keeps only its meta. Shared by the dashboard API, the MCP export
 * tools and backup/restore, so all three read the same file.
 *
 * Only JPEG and PNG are stored: both render in Word (.docx) and in browsers. The
 * dashboard re-encodes WebP (and every other upload) to JPEG before sending, which
 * also drops EXIF (GPS) and applies the camera rotation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CareerMateError, now, type ProfilePhoto } from '@careermate/shared';
import { getUploadsDir } from './paths.ts';
import { profileRepo } from './repositories.ts';

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Detect the image type from its magic bytes (the client's Content-Type is not trusted). */
export function sniffPhotoMime(b: Uint8Array): 'image/jpeg' | 'image/png' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  return null;
}

/** Validate and store a new photo, replacing the old one. Throws a 400/413 CareerMateError. */
export function saveProfilePhoto(bytes: Uint8Array): ProfilePhoto {
  if (bytes.length > PHOTO_MAX_BYTES) throw new CareerMateError('사진은 2MB 이하만 올릴 수 있습니다.', 413, 'photo_too_large');
  const mime = sniffPhotoMime(bytes);
  if (!mime) throw new CareerMateError('JPEG 또는 PNG 사진만 올릴 수 있습니다.', 400, 'photo_bad_type');
  const file = `profile-photo.${EXT[mime]}`;
  const dir = getUploadsDir();
  const tmp = path.join(dir, `${file}.tmp`);
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, path.join(dir, file));
  const old = profileRepo.get()?.photo;
  if (old && old.file !== file) unlinkQuiet(old.file);
  const meta: ProfilePhoto = { file, mime, size: bytes.length, updated_at: now() };
  profileRepo.setPhoto(meta);
  return meta;
}

/**
 * Put a restored photo file in place (or clear it) without touching the profile row,
 * which the restore already set. Falls back to a full save when the row has no meta.
 */
export function restoreProfilePhotoFile(bytes: Uint8Array | null): void {
  const mime = bytes ? sniffPhotoMime(bytes) : null;
  for (const ext of Object.values(EXT)) if (!mime || EXT[mime] !== ext) unlinkQuiet(`profile-photo.${ext}`);
  if (!bytes || !mime) return;
  if (!profileRepo.get()?.photo) {
    saveProfilePhoto(bytes);
    return;
  }
  const file = `profile-photo.${EXT[mime]}`;
  const tmp = path.join(getUploadsDir(), `${file}.tmp`);
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, path.join(getUploadsDir(), file));
}

/** The stored photo, or null when there is none or its file went missing. */
export function readProfilePhoto(): { bytes: Uint8Array; mime: string } | null {
  const meta = profileRepo.get()?.photo;
  if (!meta || !EXT[meta.mime]) return null;
  try {
    return { bytes: fs.readFileSync(path.join(getUploadsDir(), path.basename(meta.file))), mime: meta.mime };
  } catch {
    return null;
  }
}

/** Delete the photo file and clear its meta. Also clears leftover files after a reset. */
export function removeProfilePhoto(): void {
  for (const ext of Object.values(EXT)) unlinkQuiet(`profile-photo.${ext}`);
  profileRepo.setPhoto(null);
}

/**
 * The photo to put into an export: `include` true/false is the caller's explicit
 * choice, undefined falls back to the profile's "include by default" setting.
 */
export function photoForExport(include?: boolean): { bytes: Uint8Array; mime: string } | null {
  const want = include ?? profileRepo.get()?.photo_in_exports ?? false;
  return want ? readProfilePhoto() : null;
}

function unlinkQuiet(file: string): void {
  try {
    fs.unlinkSync(path.join(getUploadsDir(), path.basename(file)));
  } catch {
    /* already gone */
  }
}
