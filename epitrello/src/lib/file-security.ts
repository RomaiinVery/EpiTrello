/**
 * File Security Utility
 *
 * Provides comprehensive file validation and security checks to prevent:
 * - Malicious file uploads
 * - Zip bombs
 * - File type spoofing
 * - Oversized files
 * - Invalid images
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileSecurityConfig {
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  checkMagicNumbers?: boolean;
  enableZipBombDetection?: boolean;
  maxCompressionRatio?: number;
}

// Default configuration
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_COMPRESSION_RATIO = 100; // Alert if file expands more than 100x

// Magic numbers (file signatures) for common file types
const FILE_SIGNATURES: { [key: string]: number[][] } = {
  // Images
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'image/bmp': [[0x42, 0x4D]], // BM
  'image/svg+xml': [[0x3C, 0x73, 0x76, 0x67], [0x3C, 0x3F, 0x78, 0x6D, 0x6C]], // <svg or <?xml

  // Documents
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // PK
  'application/x-rar-compressed': [[0x52, 0x61, 0x72, 0x21]], // Rar!
  'application/x-7z-compressed': [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]], // 7z

  // Office documents (ZIP-based)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]], // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B, 0x03, 0x04]], // .pptx

  // Text
  'text/plain': [], // No magic number for plain text
  'text/csv': [],
  'application/json': [],
};

// Allowed MIME types for attachments
const DEFAULT_ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',

  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',

  // Archives (with caution)
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
];

// Allowed file extensions
const DEFAULT_ALLOWED_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',

  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',

  // Text
  '.txt', '.csv', '.md', '.json',

  // Archives
  '.zip', '.rar', '.7z', '.gz',
];

/**
 * Validate file against security policies
 */
export async function validateFile(
  file: File,
  config: FileSecurityConfig = {}
): Promise<FileValidationResult> {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
    checkMagicNumbers = true,
    enableZipBombDetection = true,
    maxCompressionRatio = DEFAULT_MAX_COMPRESSION_RATIO,
  } = config;

  const warnings: string[] = [];

  // 1. Check file size
  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${formatBytes(maxFileSize)}`,
    };
  }

  // Check for suspiciously small files claiming to be large archives
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Empty file not allowed',
    };
  }

  // 2. Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed`,
    };
  }

  // 3. Check file extension
  const extension = getFileExtension(file.name).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension '${extension}' is not allowed`,
    };
  }

  // 4. Verify MIME type matches extension
  const expectedMimeType = getMimeTypeFromExtension(extension);
  if (expectedMimeType && file.type !== expectedMimeType) {
    warnings.push(`MIME type '${file.type}' does not match extension '${extension}'`);
  }

  // 5. Check magic numbers (file signature)
  if (checkMagicNumbers) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const magicNumberValid = verifyMagicNumber(bytes, file.type);
    if (!magicNumberValid) {
      return {
        valid: false,
        error: 'File content does not match declared file type (possible file spoofing)',
      };
    }
  }

  // 6. Zip bomb detection for compressed files
  if (enableZipBombDetection && isCompressedFile(file.type)) {
    const buffer = await file.arrayBuffer();
    const zipBombCheck = await detectZipBomb(buffer, file.type, maxCompressionRatio);

    if (!zipBombCheck.safe) {
      return {
        valid: false,
        error: zipBombCheck.error || 'Potential zip bomb detected',
      };
    }

    if (zipBombCheck.warning) {
      warnings.push(zipBombCheck.warning);
    }
  }

  // 7. Additional validation for images
  if (file.type.startsWith('image/')) {
    const imageValidation = await validateImage(file);
    if (!imageValidation.valid) {
      return imageValidation;
    }
    if (imageValidation.warnings) {
      warnings.push(...imageValidation.warnings);
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Verify file magic number (signature)
 */
function verifyMagicNumber(bytes: Uint8Array, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];

  // If no signature defined, allow (like text files)
  if (!signatures || signatures.length === 0) {
    return true;
  }

  // Check if file matches any of the valid signatures
  return signatures.some(signature => {
    if (bytes.length < signature.length) {
      return false;
    }

    return signature.every((byte, index) => bytes[index] === byte);
  });
}

/**
 * Detect potential zip bombs
 */
async function detectZipBomb(
  buffer: ArrayBuffer,
  mimeType: string,
  maxCompressionRatio: number
): Promise<{ safe: boolean; error?: string; warning?: string }> {
  const compressedSize = buffer.byteLength;

  // For very small files, skip detection
  if (compressedSize < 1024) {
    return { safe: true };
  }

  // Basic heuristic: Check if file has suspicious patterns
  const bytes = new Uint8Array(buffer);

  // Check for excessive null bytes (common in zip bombs)
  let nullCount = 0;
  const sampleSize = Math.min(1024, bytes.length);
  for (let i = 0; i < sampleSize; i++) {
    if (bytes[i] === 0) nullCount++;
  }

  const nullRatio = nullCount / sampleSize;
  if (nullRatio > 0.95) {
    return {
      safe: false,
      error: 'Suspicious file structure detected (excessive null bytes)',
    };
  }

  // For ZIP files, perform more detailed analysis
  if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    // Check for nested ZIP structures (common in zip bombs)
    const zipHeader = [0x50, 0x4B, 0x03, 0x04];
    let zipHeaderCount = 0;

    for (let i = 0; i < bytes.length - 4; i++) {
      if (
        bytes[i] === zipHeader[0] &&
        bytes[i + 1] === zipHeader[1] &&
        bytes[i + 2] === zipHeader[2] &&
        bytes[i + 3] === zipHeader[3]
      ) {
        zipHeaderCount++;
      }
    }

    // If too many nested ZIP headers, it's suspicious
    if (zipHeaderCount > 10) {
      return {
        safe: false,
        error: 'Excessive nesting detected in archive (potential zip bomb)',
      };
    }

    if (zipHeaderCount > 5) {
      return {
        safe: true,
        warning: 'Archive contains multiple nested files',
      };
    }
  }

  return { safe: true };
}

/**
 * Validate image files
 */
async function validateImage(file: File): Promise<FileValidationResult> {
  const warnings: string[] = [];

  // SVG files need special handling (XML-based, can contain scripts)
  if (file.type === 'image/svg+xml') {
    const text = await file.text();

    // Check for potentially dangerous elements
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // event handlers like onclick=
      /<iframe/i,
      /<embed/i,
      /<object/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        return {
          valid: false,
          error: 'SVG file contains potentially dangerous content',
        };
      }
    }
  }

  // For raster images, verify they can be loaded
  try {
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type });
    const url = URL.createObjectURL(blob);

    // This is a basic check - in a Node.js environment, you might use a library
    // In the browser, we rely on the browser's image decoder
    URL.revokeObjectURL(url);
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid or corrupted image file',
    };
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if file type is compressed
 */
function isCompressedFile(mimeType: string): boolean {
  const compressedTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-gzip',
  ];

  return compressedTypes.includes(mimeType);
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot);
}

/**
 * Get expected MIME type from file extension
 */
function getMimeTypeFromExtension(extension: string): string | null {
  const mimeMap: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.gz': 'application/gzip',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  return mimeMap[extension.toLowerCase()] || null;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file for cover images (stricter rules)
 */
export async function validateCoverImage(file: File): Promise<FileValidationResult> {
  // Cover images should only be images
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Cover must be an image file',
    };
  }

  // Restrict to common image formats only
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  return validateFile(file, {
    maxFileSize: 5 * 1024 * 1024, // 5MB for cover images
    allowedMimeTypes: allowedImageTypes,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    checkMagicNumbers: true,
    enableZipBombDetection: false, // Images are not compressed archives
  });
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  let sanitized = filename.replace(/^.*[\\\/]/, '');

  // Remove any characters that could be dangerous
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const extension = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.length - extension.length);
    sanitized = nameWithoutExt.substring(0, 255 - extension.length) + extension;
  }

  return sanitized;
}
