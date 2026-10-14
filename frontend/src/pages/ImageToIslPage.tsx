import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Languages,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import { LinguisticBreakdown } from '../components/translation/LinguisticBreakdown.tsx';
import { uploadAndOcrDocument, OcrTranslationResponse } from '../api/media.ts';
import { translateText, TextTranslationResponse } from '../api/translation.ts';

export function ImageToIslPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [sourceLanguage, setSourceLanguage] = useState<'en' | 'hi'>('en');

  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [ocrMetadata, setOcrMetadata] = useState<OcrTranslationResponse['metadata'] | null>(null);

  const [translationResult, setTranslationResult] = useState<TextTranslationResponse | null>(null);
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>(['WELCOME', 'FRIEND']);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setOcrError(null);
    setOcrStatus('idle');
    setExtractedText('');
    setTranslationResult(null);

    const isDocumentPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setIsPdf(isDocumentPdf);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRunOcr = async () => {
    if (!selectedFile) return;

    setOcrStatus('processing');
    setOcrError(null);

    try {
      const result = await uploadAndOcrDocument(
        selectedFile,
        sourceLanguage,
        isPdf ? pageNumber : undefined,
        true
      );

      setExtractedText(result.extracted_text);
      setOcrMetadata(result.metadata);
      setOcrStatus('completed');

      if (result.translation) {
        setTranslationResult(result.translation);
        const glosses = result.translation.segments.map((s) =>
          s.is_supported ? s.gloss : s.source_token.toUpperCase()
        );
        if (glosses.length > 0) setAvatarGlosses(glosses);
      }
    } catch (err: unknown) {
      setOcrStatus('error');
      const msg = err instanceof Error ? err.message : 'OCR extraction failed';
      setOcrError(msg);
    }
  };

  const handleTranslateEditedText = async () => {
    if (!extractedText.trim()) return;

    setIsTranslating(true);
    try {
      const result = await translateText({
        text: extractedText,
        source_language: sourceLanguage,
        save_history: true,
      });

      setTranslationResult(result);
      const glosses = result.segments.map((s) =>
        s.is_supported ? s.gloss : s.source_token.toUpperCase()
      );
      if (glosses.length > 0) setAvatarGlosses(glosses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setOcrError(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <FileText className="w-3.5 h-3.5" />
            <span>Direction A: Document & Image OCR to ISL</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Extract Text from Documents to Sign Language</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Upload images (PNG, JPEG, WebP) or documents (PDF). Optical Character Recognition (Tesseract 5) extracts the textual content into an editable transcription that translates into 3D avatar animations with linguist-reviewed grammar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & OCR Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload Document or Image</span>
              </h3>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <Languages className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value as 'en' | 'hi')}
                  className="bg-[#0b0f19] border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop File Input */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0b0f19]"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <ImageIcon className="w-10 h-10 text-gray-500 mb-2" />
              <span className="text-xs font-semibold text-gray-200">
                {selectedFile ? selectedFile.name : 'Choose file or drag & drop'}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                PNG, JPEG, WebP, PDF (Max 15MB)
              </span>
            </label>

            {/* PDF Page Selection */}
            {isPdf && selectedFile && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs">
                <span className="text-gray-300 font-medium">Target PDF Page:</span>
                <input
                  type="number"
                  min={1}
                  value={pageNumber}
                  onChange={(e) => setPageNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 rounded bg-gray-900 border border-gray-700 text-xs text-gray-100 text-center focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* Image Preview */}
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-800 max-h-48 flex items-center justify-center bg-black">
                <img src={previewUrl} alt="Preview" className="max-h-48 object-contain" />
              </div>
            )}

            {/* Extract Action Button */}
            {selectedFile && ocrStatus !== 'processing' && (
              <button
                type="button"
                onClick={handleRunOcr}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run Tesseract OCR Extraction</span>
              </button>
            )}

            {/* Progress Spinner */}
            {ocrStatus === 'processing' && (
              <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-3 text-xs text-amber-400 font-mono">
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <span>Running Tesseract 5 optical character recognition...</span>
              </div>
            )}

            {/* Error Banner */}
            {ocrStatus === 'error' && ocrError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 flex items-start gap-2.5 text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-red-300">OCR Extraction Notice:</span>
                  <p className="text-[11px] leading-relaxed text-red-200/90">{ocrError}</p>
                </div>
              </div>
            )}

            {/* Editable OCR Transcript */}
            {ocrStatus === 'completed' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-300">Editable OCR Transcript:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Extracted ({ocrMetadata?.word_count || 0} words)
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 font-sans"
                  placeholder="Review or edit extracted text..."
                />

                <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                  <span>{extractedText.length} characters</span>
                  <span>{extractedText.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>

                <button
                  type="button"
                  onClick={handleTranslateEditedText}
                  disabled={isTranslating || !extractedText.trim()}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Translating to ISL...</span>
                    </>
                  ) : (
                    <>
                      <span>Translate & Send to 3D Avatar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3D Avatar & Linguistic Breakdown Output */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>ISL Translation Playback</span>
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {avatarGlosses.length} Glosses
              </span>
            </h3>

            <AvatarViewer
              initialGlosses={avatarGlosses}
              autoPlay={false}
              heightClassName="h-[420px]"
              showSequenceList={true}
            />
          </div>

          {/* Linguistic Breakdown when available */}
          {translationResult && (
            <LinguisticBreakdown
              normalizedTokens={translationResult.normalized_tokens}
              reorderedGlosses={translationResult.reordered_glosses}
              grammarRules={translationResult.grammar_rules_applied}
              segments={translationResult.segments}
              coverage={translationResult.coverage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
