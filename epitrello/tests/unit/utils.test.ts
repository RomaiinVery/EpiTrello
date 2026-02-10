import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class');
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-class');
      expect(result).not.toContain('hidden-class');
    });

    it('should merge conflicting tailwind classes', () => {
      const result = cn('p-4', 'p-2');
      // tailwind-merge should keep only the last padding class
      expect(result).toBe('p-2');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['text-sm', 'font-bold'], 'text-center');
      expect(result).toContain('text-sm');
      expect(result).toContain('font-bold');
      expect(result).toContain('text-center');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should filter out falsy values', () => {
      const result = cn('valid', null, undefined, false, '', 'another-valid');
      expect(result).toContain('valid');
      expect(result).toContain('another-valid');
    });
  });
});
