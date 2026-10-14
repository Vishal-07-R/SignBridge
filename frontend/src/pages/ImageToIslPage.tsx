import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Upload,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import { normalizeSignKey } from '../components/avatar/clipMapper.ts';

export function ImageToIslPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [extractedText, setExtractedText] = useState('');
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>(['WELCOME', 'FRIEND']);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Simulate OCR processing
    setOcrStatus('processing');
    setTimeout(() => {
      // Demo simulated extraction based on filename or default
      const simulatedText = 'Hello welcome friend thank you';
      setExtractedText(simulatedText);
      setOcrStatus('completed');
    }, 800);
  };

  const handleSendToAvatar = () => {
    if (!extractedText.trim()) return;
    const tokens = extractedText
      .trim()
      .split(/\s+/)
      .map((w) => normalizeSignKey(w));
    setAvatarGlosses(tokens);
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
            Upload images (PNG, JPEG, WebP) or documents (PDF). Optical Character Recognition extracts the textual content into an editable transcription that is translated into 3D avatar animations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & OCR Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload Document or Image</span>
            </h3>

            {/* Drag & Drop File Input */}
            <label className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0b0f19]">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
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

            {/* Image Preview */}
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-800 max-h-48 flex items-center justify-center bg-black">
                <img src={previewUrl} alt="Preview" className="max-h-48 object-contain" />
              </div>
            )}

            {/* OCR Progress & Editable Output */}
            {ocrStatus === 'processing' && (
              <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-3 text-xs text-amber-400 font-mono">
                <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Running OCR text recognition pipeline...</span>
              </div>
            )}

            {ocrStatus === 'completed' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-300">Editable OCR Transcript:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Extracted
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 font-sans"
                />
                <button
                  type="button"
                  onClick={handleSendToAvatar}
                  className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Send to 3D Avatar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3D Avatar Output */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>ISL Translation Playback</span>
            </h3>

            <AvatarViewer
              initialGlosses={avatarGlosses}
              autoPlay={false}
              heightClassName="h-[420px]"
              showSequenceList={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
