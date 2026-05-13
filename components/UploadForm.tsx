'use client';

import { useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  checkBookExists,
  createBook,
  saveBookSegments,
} from '@/lib/actions/book.actions';
import { useRouter } from 'next/navigation';
import { parsePDFFile, generateSlug } from '@/lib/utils';
import { upload } from '@vercel/blob/client';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  persona: z.string().min(1, 'Please select a persona'),
  voice: z.enum(['male', 'female']),
});

type FormValues = z.infer<typeof schema>;

function LoadingOverlay() {
  return (
    <div className="loading-wrapper">
      <div className="loading-shadow-wrapper bg-white shadow-soft-md">
        <div className="loading-shadow">
          <svg
            className="loading-animation w-14 h-14 text-(--color-brand)"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="loading-title">Synthesizing your book...</p>
          <div className="loading-progress">
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span>Processing PDF</span>
            </div>
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span>Generating interview questions</span>
            </div>
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span>Preparing your voice assistant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadForm() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { userId } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { voice: 'female' },
  });

  const selectedVoice = useWatch({ control, name: 'voice' });

  const onSubmit = async (data: FormValues) => {
    if (!userId) {
      return toast.error('Please login to upload books');
    }

    setIsSubmitting(true);

    // TODO: PostHog -> Track Book Uploads...

    try {
      const existsCheck = await checkBookExists(data.title);

      if (existsCheck.exists && existsCheck.book) {
        toast.info('Book with the same title already exists.');
        reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;
      }

      if (!pdfFile) {
        toast.error('Please upload a PDF file.');
        return;
      }

      const fileTitle = generateSlug(data.title);

      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error(
          'Failed to parse PDF. Please try again with a different file.',
        );
        return;
      }

      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: 'application/pdf',
      });

      let coverUrl: string;
      let coverBlobKey: string;

      if (coverFile) {
        const uploadedCoverBlob = await upload(
          `${fileTitle}_cover.png`,
          coverFile,
          {
            access: 'public',
            handleUploadUrl: '/api/upload',
            contentType: coverFile.type,
          },
        );
        coverUrl = uploadedCoverBlob.url;
        coverBlobKey = uploadedCoverBlob.pathname;
      } else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();

        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: 'image/png',
        });
        coverUrl = uploadedCoverBlob.url;
        coverBlobKey = uploadedCoverBlob.pathname;
      }

      const book = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.persona,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        coverBlobKey,
        fileSize: pdfFile.size,
      });

      if (!book.success) {
        toast.error((book.error as string) || 'Failed to create book');

        return;
      }

      if (book.alreadyExists) {
        toast.info('Book with same title already exists.');
        reset();
        router.push(`/books/${book.data.slug}`);
        return;
      }

      const segments = await saveBookSegments(
        book.data.id,
        userId,
        parsedPDF.content,
      );

      if (!segments.success) {
        toast.error('Failed to save book segments');
        throw new Error('Failed to save book segments');
      }

      reset();
      router.push('/');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload book. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="new-book-wrapper space-y-8"
      >
        {/* PDF Upload */}
        <div>
          <label className="form-label">Upload Book PDF</label>
          <div
            className={`upload-dropzone border-2 border-dashed border-(--border-medium) ${pdfFile ? 'upload-dropzone-uploaded' : ''}`}
            onClick={() => pdfInputRef.current?.click()}
          >
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPdfFile(file);
              }}
            />
            <BookOpen className="upload-dropzone-icon" />
            {pdfFile ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="upload-dropzone-text">{pdfFile.name}</span>
                  <button
                    type="button"
                    className="upload-dropzone-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfFile(null);
                      if (pdfInputRef.current) pdfInputRef.current.value = '';
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="upload-dropzone-hint">
                  Click to change file
                </span>
              </>
            ) : (
              <>
                <span className="upload-dropzone-text">
                  Click to upload PDF
                </span>
                <span className="upload-dropzone-hint">
                  PDF file (max 50MB)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="form-label">Title</label>
          <input
            {...register('title')}
            className="form-input"
            placeholder="ex: Rich Dad Poor Dad"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Author */}
        <div>
          <label className="form-label">Author Name</label>
          <input
            {...register('author')}
            className="form-input"
            placeholder="ex: Robert Kiyosaki"
          />
          {errors.author && (
            <p className="text-red-500 text-sm mt-1">{errors.author.message}</p>
          )}
        </div>

        {/* Interviewer Persona */}
        <div>
          <label className="form-label">Choose Interviewer Persona</label>
          <Select
            onValueChange={(v) =>
              setValue('persona', v, { shouldValidate: true })
            }
          >
            <SelectTrigger className="select-trigger">
              <SelectValue placeholder="Select persona" />
            </SelectTrigger>
            <SelectContent className="select-content">
              <SelectItem value="intellectual" className="select-item">
                Intellectual
              </SelectItem>
              <SelectItem value="casual" className="select-item">
                Casual
              </SelectItem>
              <SelectItem value="provocateur" className="select-item">
                Provocateur
              </SelectItem>
              <SelectItem value="socratic" className="select-item">
                Socratic
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.persona && (
            <p className="text-red-500 text-sm mt-1">
              {errors.persona.message}
            </p>
          )}
        </div>

        {/* Voice */}
        <div>
          <label className="form-label">Choose Assistant Voice</label>
          <div className="voice-selector-options">
            <label
              className={`voice-selector-option ${
                selectedVoice === 'male'
                  ? 'voice-selector-option-selected'
                  : 'voice-selector-option-default'
              }`}
            >
              <input
                type="radio"
                {...register('voice')}
                value="male"
                className="accent-(--color-brand) w-4 h-4"
              />
              <span className="text-lg font-medium">Male</span>
            </label>
            <label
              className={`voice-selector-option ${
                selectedVoice === 'female'
                  ? 'voice-selector-option-selected'
                  : 'voice-selector-option-default'
              }`}
            >
              <input
                type="radio"
                {...register('voice')}
                value="female"
                className="accent-(--color-brand) w-4 h-4"
              />
              <span className="text-lg font-medium">Female</span>
            </label>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="form-label">Upload Book Cover Image</label>
          <div
            className={`upload-dropzone border-2 border-dashed border-(--border-medium) ${coverFile ? 'upload-dropzone-uploaded' : ''}`}
            onClick={() => coverInputRef.current?.click()}
          >
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCoverFile(file);
              }}
            />
            <BookOpen className="upload-dropzone-icon" />
            {coverFile ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="upload-dropzone-text">{coverFile.name}</span>
                  <button
                    type="button"
                    className="upload-dropzone-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverFile(null);
                      if (coverInputRef.current)
                        coverInputRef.current.value = '';
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="upload-dropzone-hint">
                  Click to change file
                </span>
              </>
            ) : (
              <span className="upload-dropzone-text">
                Drag & drop your image here, or{' '}
                <span className="text-(--color-brand) underline">browse</span>
              </span>
            )}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="form-btn">
          Begin Synthesis
        </button>
      </form>
    </>
  );
}
