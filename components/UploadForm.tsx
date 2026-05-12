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

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { voice: 'female' },
  });

  const selectedVoice = useWatch({ control, name: 'voice' });

  const onSubmit = async () => {
    setIsSubmitting(true);
    // TODO: call server action
    setIsSubmitting(false);
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
                <span className="upload-dropzone-hint">Click to change file</span>
              </>
            ) : (
              <>
                <span className="upload-dropzone-text">Click to upload PDF</span>
                <span className="upload-dropzone-hint">PDF file (max 50MB)</span>
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
          <Select onValueChange={(v) => setValue('persona', v, { shouldValidate: true })}>
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
            <p className="text-red-500 text-sm mt-1">{errors.persona.message}</p>
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
                      if (coverInputRef.current) coverInputRef.current.value = '';
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="upload-dropzone-hint">Click to change file</span>
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
