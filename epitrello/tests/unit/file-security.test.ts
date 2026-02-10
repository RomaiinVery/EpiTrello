import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateCoverImage,
  sanitizeFilename,
  type FileValidationResult,
  type FileSecurityConfig,
} from '@/lib/file-security';

/**
 * Helper to create mock File objects for testing
 */
function createMockFile(
  name: string,
  type: string,
  content: Uint8Array | number[]
): File {
  const array = content instanceof Uint8Array ? content : new Uint8Array(content);
  const blob = new Blob([array], { type });
  const file = new File([blob], name, { type });

  // Ensure arrayBuffer method exists for Node.js environment
  if (!file.arrayBuffer) {
    (file as any).arrayBuffer = async function() {
      return array.buffer;
    };
  }

  return file;
}

describe('file-security', () => {
  describe('validateFile', () => {
    describe('file size validation', () => {
      it('should reject files exceeding max size', async () => {
        const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
        const file = createMockFile('large.png', 'image/png', largeContent);

        const result = await validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('File size exceeds maximum');
      });

      it('should reject empty files', async () => {
        const file = createMockFile('empty.png', 'image/png', []);

        const result = await validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Empty file not allowed');
      });

      it('should accept files within size limit', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const file = createMockFile('small.png', 'image/png', pngHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should respect custom max file size', async () => {
        const content = new Uint8Array(2 * 1024); // 2KB
        const file = createMockFile('test.txt', 'text/plain', content);

        const config: FileSecurityConfig = {
          maxFileSize: 1024, // 1KB
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('File size exceeds maximum');
      });
    });

    describe('MIME type validation', () => {
      it('should reject disallowed MIME types', async () => {
        const file = createMockFile('malware.exe', 'application/x-msdownload', [0x4D, 0x5A]);

        const result = await validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('File type');
        expect(result.error).toContain('not allowed');
      });

      it('should accept allowed image MIME types', async () => {
        const jpegHeader = [0xFF, 0xD8, 0xFF];
        const file = createMockFile('photo.jpg', 'image/jpeg', jpegHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept allowed document MIME types', async () => {
        const pdfHeader = [0x25, 0x50, 0x44, 0x46]; // %PDF
        const file = createMockFile('doc.pdf', 'application/pdf', pdfHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept text files', async () => {
        const file = createMockFile('text.txt', 'text/plain', [0x48, 0x65, 0x6C, 0x6C, 0x6F]);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should respect custom allowed MIME types', async () => {
        const file = createMockFile('text.txt', 'text/plain', [0x48, 0x65, 0x6C, 0x6C, 0x6F]);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['image/png'], // Only PNG allowed
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(false);
      });
    });

    describe('file extension validation', () => {
      it('should reject disallowed extensions', async () => {
        const file = createMockFile('script.sh', 'text/plain', [0x23, 0x21]);

        const result = await validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('File extension');
        expect(result.error).toContain('not allowed');
      });

      it('should accept allowed extensions', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const file = createMockFile('image.png', 'image/png', pngHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should be case insensitive for extensions', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const file = createMockFile('IMAGE.PNG', 'image/png', pngHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should respect custom allowed extensions', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const file = createMockFile('image.png', 'image/png', pngHeader);

        const config: FileSecurityConfig = {
          allowedExtensions: ['.jpg'],
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(false);
      });
    });

    describe('MIME type and extension matching', () => {
      it('should warn when MIME type does not match extension', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        // PNG header but claiming to be JPEG
        const file = createMockFile('fake.jpg', 'image/png', pngHeader);

        const result = await validateFile(file);

        expect(result.warnings).toBeDefined();
        expect(result.warnings?.[0]).toContain('does not match extension');
      });
    });

    describe('magic number verification', () => {
      it('should reject files with invalid magic numbers', async () => {
        // Wrong header for PNG
        const invalidHeader = [0x00, 0x00, 0x00, 0x00];
        const file = createMockFile('fake.png', 'image/png', invalidHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not match declared file type');
        expect(result.error).toContain('spoofing');
      });

      it('should accept valid PNG magic numbers', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const file = createMockFile('valid.png', 'image/png', pngHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid JPEG magic numbers', async () => {
        const jpegHeader = [0xFF, 0xD8, 0xFF];
        const file = createMockFile('valid.jpg', 'image/jpeg', jpegHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid PDF magic numbers', async () => {
        const pdfHeader = [0x25, 0x50, 0x44, 0x46]; // %PDF
        const file = createMockFile('valid.pdf', 'application/pdf', pdfHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid GIF87a magic numbers', async () => {
        const gifHeader = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]; // GIF87a
        const file = createMockFile('valid.gif', 'image/gif', gifHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid GIF89a magic numbers', async () => {
        const gifHeader = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // GIF89a
        const file = createMockFile('valid.gif', 'image/gif', gifHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid WebP magic numbers', async () => {
        const webpHeader = [0x52, 0x49, 0x46, 0x46]; // RIFF
        const file = createMockFile('valid.webp', 'image/webp', webpHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid BMP magic numbers', async () => {
        const bmpHeader = [0x42, 0x4D]; // BM
        const file = createMockFile('valid.bmp', 'image/bmp', bmpHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should allow files without magic numbers (text files)', async () => {
        const textContent = [0x48, 0x65, 0x6C, 0x6C, 0x6F]; // "Hello"
        const file = createMockFile('test.txt', 'text/plain', textContent);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should skip magic number check when disabled', async () => {
        const invalidHeader = [0x00, 0x00, 0x00, 0x00];
        const file = createMockFile('fake.png', 'image/png', invalidHeader);

        const config: FileSecurityConfig = {
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        // Should still be valid since magic number check is disabled
        // (assuming it passes other checks)
        expect(result.valid).toBe(true);
      });
    });

    describe('zip bomb detection', () => {
      it('should skip detection for very small files', async () => {
        const smallZip = new Uint8Array(500); // Less than 1KB
        const file = createMockFile('small.zip', 'application/zip', smallZip);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(true);
      });

      it('should detect excessive null bytes', async () => {
        const suspiciousContent = new Uint8Array(2048);
        suspiciousContent.fill(0); // All null bytes
        const file = createMockFile('suspicious.zip', 'application/zip', suspiciousContent);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('excessive null bytes');
      });

      it('should detect excessive nesting in ZIP files', async () => {
        const content = new Uint8Array(2048);
        // Fill with non-null bytes to avoid null byte detection
        content.fill(0xFF);
        const zipHeader = [0x50, 0x4B, 0x03, 0x04];

        // Add 15 ZIP headers (more than the threshold of 10)
        for (let i = 0; i < 15; i++) {
          const offset = i * 100;
          zipHeader.forEach((byte, idx) => {
            content[offset + idx] = byte;
          });
        }

        const file = createMockFile('nested.zip', 'application/zip', content);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Excessive nesting');
        expect(result.error).toContain('zip bomb');
      });

      it('should warn about moderate nesting in ZIP files', async () => {
        const content = new Uint8Array(2048);
        // Fill with non-null bytes to avoid null byte detection
        content.fill(0xFF);
        const zipHeader = [0x50, 0x4B, 0x03, 0x04];

        // Add 7 ZIP headers (between 5 and 10)
        for (let i = 0; i < 7; i++) {
          const offset = i * 100;
          zipHeader.forEach((byte, idx) => {
            content[offset + idx] = byte;
          });
        }

        const file = createMockFile('nested.zip', 'application/zip', content);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings?.[0]).toContain('nested files');
      });

      it('should skip zip bomb detection when disabled', async () => {
        const suspiciousContent = new Uint8Array(2048);
        suspiciousContent.fill(0);
        const file = createMockFile('test.zip', 'application/zip', suspiciousContent);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
          enableZipBombDetection: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(true);
      });

      it('should accept safe ZIP files with few headers', async () => {
        const content = new Uint8Array(2048);
        // Fill with non-null bytes
        content.fill(0xFF);
        const zipHeader = [0x50, 0x4B, 0x03, 0x04];

        // Add only 3 ZIP headers (below warning threshold of 5)
        for (let i = 0; i < 3; i++) {
          const offset = i * 100;
          zipHeader.forEach((byte, idx) => {
            content[offset + idx] = byte;
          });
        }

        const file = createMockFile('safe.zip', 'application/zip', content);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(true);
        expect(result.warnings).toBeUndefined();
      });

      it('should accept non-compressed archives', async () => {
        const content = new Uint8Array(2048);
        content.fill(0xAA); // Non-null pattern

        const file = createMockFile('archive.zip', 'application/zip', content);

        const config: FileSecurityConfig = {
          allowedMimeTypes: ['application/zip'],
          allowedExtensions: ['.zip'],
          checkMagicNumbers: false,
        };

        const result = await validateFile(file, config);

        expect(result.valid).toBe(true);
      });
    });

    describe('image validation', () => {
      it('should validate image files', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const file = createMockFile('image.png', 'image/png', pngHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should handle image validation for JPEG', async () => {
        const jpegHeader = [0xFF, 0xD8, 0xFF];
        const file = createMockFile('photo.jpg', 'image/jpeg', jpegHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should detect corrupted images', async () => {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        let callCount = 0;
        const corruptedFile = createMockFile('corrupt.png', 'image/png', pngHeader);

        // Override arrayBuffer to work once (for magic number check) then throw (for image validation)
        const originalArrayBuffer = (corruptedFile as any).arrayBuffer;
        (corruptedFile as any).arrayBuffer = async function() {
          callCount++;
          if (callCount === 1) {
            // First call (magic number check) - return valid PNG header
            return originalArrayBuffer.call(this);
          }
          // Second call (image validation) - throw error
          throw new Error('File read error');
        };

        const result = await validateFile(corruptedFile);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid or corrupted');
      });

      it('should accept valid GIF images', async () => {
        const gifHeader = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
        const file = createMockFile('image.gif', 'image/gif', gifHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });

      it('should accept valid WebP images', async () => {
        const webpHeader = [0x52, 0x49, 0x46, 0x46];
        const file = createMockFile('image.webp', 'image/webp', webpHeader);

        const result = await validateFile(file);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateCoverImage', () => {
    it('should reject non-image files', async () => {
      const file = createMockFile('document.pdf', 'application/pdf', [0x25, 0x50, 0x44, 0x46]);

      const result = await validateCoverImage(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cover must be an image file');
    });

    it('should accept valid JPEG cover images', async () => {
      const jpegHeader = [0xFF, 0xD8, 0xFF];
      const file = createMockFile('cover.jpg', 'image/jpeg', jpegHeader);

      const result = await validateCoverImage(file);

      expect(result.valid).toBe(true);
    });

    it('should accept valid PNG cover images', async () => {
      const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      const file = createMockFile('cover.png', 'image/png', pngHeader);

      const result = await validateCoverImage(file);

      expect(result.valid).toBe(true);
    });

    it('should reject cover images exceeding 5MB', async () => {
      const largeContent = new Uint8Array(6 * 1024 * 1024); // 6MB
      // Add PNG header
      largeContent[0] = 0x89;
      largeContent[1] = 0x50;
      largeContent[2] = 0x4E;
      largeContent[3] = 0x47;
      largeContent[4] = 0x0D;
      largeContent[5] = 0x0A;
      largeContent[6] = 0x1A;
      largeContent[7] = 0x0A;

      const file = createMockFile('large-cover.png', 'image/png', largeContent);

      const result = await validateCoverImage(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds');
    });

    it('should reject BMP files for cover images', async () => {
      const bmpHeader = [0x42, 0x4D];
      const file = createMockFile('cover.bmp', 'image/bmp', bmpHeader);

      const result = await validateCoverImage(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path components', () => {
      const result = sanitizeFilename('../../../etc/passwd');
      expect(result).toBe('passwd');
    });

    it('should remove dangerous characters', () => {
      const result = sanitizeFilename('file<>:"|?*.txt');
      expect(result).toBe('file_______.txt');
    });

    it('should preserve safe characters', () => {
      const result = sanitizeFilename('my-file_name.2024.txt');
      expect(result).toBe('my-file_name.2024.txt');
    });

    it('should limit filename length to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);

      expect(result.length).toBe(255);
      expect(result.endsWith('.txt')).toBe(true);
    });

    it('should preserve extension when truncating', () => {
      const longName = 'a'.repeat(300) + '.jpeg';
      const result = sanitizeFilename(longName);

      expect(result.length).toBe(255);
      expect(result.endsWith('.jpeg')).toBe(true);
    });

    it('should handle Windows path separators', () => {
      const result = sanitizeFilename('C:\\Users\\test\\file.txt');
      expect(result).toBe('file.txt');
    });

    it('should handle Unix path separators', () => {
      const result = sanitizeFilename('/home/user/file.txt');
      expect(result).toBe('file.txt');
    });

    it('should handle mixed path separators', () => {
      const result = sanitizeFilename('C:\\Users/test\\file.txt');
      expect(result).toBe('file.txt');
    });

    it('should handle filenames without extensions', () => {
      const result = sanitizeFilename('README');
      expect(result).toBe('README');
    });

    it('should handle empty filename', () => {
      const result = sanitizeFilename('');
      expect(result).toBe('');
    });

    it('should sanitize complex attack patterns', () => {
      const result = sanitizeFilename('../../<script>alert("xss")</script>.txt');
      expect(result).not.toContain('..');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
    });
  });
});
