import { InferSelectModel } from 'drizzle-orm';
import { ReactNode } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { LucideIcon } from 'lucide-react';
import { books, bookSegments } from '@/lib/db/schema';

// ============================================
// DATABASE MODELS
// ============================================

export type IBook = InferSelectModel<typeof books>;
export type IBookSegment = InferSelectModel<typeof bookSegments>;

// ============================================
// FORM & INPUT TYPES
// ============================================

export interface CreateBook {
  clerkId: string;
  title: string;
  author: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL?: string;
  coverBlobKey?: string;
  fileSize: number;
}

export interface TextSegment {
  text: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
}

export interface BookCardProps {
  title: string;
  author: string;
  coverURL: string | null;
  slug: string;
}

export interface Messages {
  role: string;
  content: string;
}

export interface ShadowBoxProps {
  children: ReactNode;
  className?: string;
}

export interface InputFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface FileUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  acceptTypes: string[];
  disabled?: boolean;
  icon: LucideIcon;
  placeholder: string;
  hint: string;
}
