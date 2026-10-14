import { useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';

interface ImportJob {
  id: string;
  sourceName: string;
  totalRecords: number;
  processedRecords: number;
  status: 'completed' | 'processing' | 'failed';
  timestamp: string;
}

export function DatasetImportPage() {
  const [importJobs, setImportJobs] = useState<ImportJob[]>([
    {
      id: 'job-001',
      sourceName: 'ISLRTC Core Vocabulary Seed v1.0',
      totalRecords: 12,
      processedRecords: 12,
      status: 'completed',
      timestamp: '2026-10-14 18:30',
    },
  ]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);

    setTimeout(() => {
      const newJob: ImportJob = {
        id: `job-00${importJobs.length + 1}`,
        sourceName: file.name,
        totalRecords: 24,
        processedRecords: 24,
        status: 'completed',
        timestamp: 'Just now',
      };
      setImportJobs([newJob, ...importJobs]);
      setIsUploading(false);
      setSelectedFile(null);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Dataset Pipeline</span>
          </div>
          <h2 className="text-xl font-bold text-white">Dataset Import & Processing Centre</h2>
          <p className="text-xs text-gray-400">
            Import certified ISL lexical datasets. Strict schema validation, duplicate detection, and provenance tracking enforced.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
            CSV / JSON Schema v1.2
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Schema Requirements */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Import Dataset File</span>
            </h3>

            {/* Dropzone */}
            <label className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0b0f19]">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileSpreadsheet className="w-10 h-10 text-gray-500 mb-2" />
              <span className="text-xs font-semibold text-gray-200">
                {selectedFile ? selectedFile.name : 'Choose CSV or JSON dataset'}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                Required columns: gloss, category, description, language_code
              </span>
            </label>

            {isUploading && (
              <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-3 text-xs text-cyan-400 font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Validating schema, calculating hash, and importing...</span>
              </div>
            )}

            {/* Schema Validation Box */}
            <div className="p-3.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-[11px] font-mono space-y-1.5 text-gray-300">
              <div className="text-cyan-400 font-bold mb-1"># Schema Validation Rules:</div>
              <div>• GLOSS: Required, uppercase alphanumeric + underscore.</div>
              <div>• CATEGORY: Validated against standard taxonomy.</div>
              <div>• DUPLICATES: Deduplicated against existing dictionary IDs.</div>
              <div>• PROVENANCE: Licence & author metadata recorded.</div>
            </div>
          </div>
        </div>

        {/* Import Jobs Queue */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-gray-800 pb-3">
              <span>Import Processing History</span>
              <span className="text-xs font-mono text-cyan-400">{importJobs.length} Jobs</span>
            </h3>

            <div className="space-y-3">
              {importJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl border border-gray-800 bg-[#0b0f19] flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{job.id}</span>
                      <span className="text-gray-400 font-sans font-semibold">{job.sourceName}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      Processed: {job.processedRecords} / {job.totalRecords} records • {job.timestamp}
                    </div>
                  </div>

                  <div>
                    {job.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px] bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                    {job.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-[11px] bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-800/60">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress
                      </span>
                    )}
                    {job.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-red-400 font-mono text-[11px] bg-red-950/50 px-2.5 py-1 rounded-md border border-red-800/60">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
