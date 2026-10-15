import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../../infrastructure/persistence/cloudinary.js';
import { InvalidImageError } from './error/invalid-image.js';

export interface StoredImage {
  url: string;
  publicId: string;
}

export class CloudinaryImageStorage {
  async uploadProfileImage(buffer: Buffer, mimeType: string): Promise<StoredImage> {
    const formatByMimeType: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };

    const format = formatByMimeType[mimeType];

    if (!format) {
      throw new InvalidImageError('Unsupported image type');
    }

    const publicId = randomUUID();

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'chat-app/profiles',
          public_id: publicId,
          format,
          overwrite: false,
        },
        (error, uploadedImage) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          if (!uploadedImage) {
            reject(new Error('Cloudinary returned no upload result'));
            return;
          }

          resolve(uploadedImage);
        },
      );

      Readable.from(buffer).pipe(stream);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    const result = (await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    })) as { result: 'ok' | 'not found' };

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('Unable to delete Cloudinary image');
    }
  }
}
