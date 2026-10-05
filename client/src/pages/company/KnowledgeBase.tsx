import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  FileText,
  UploadCloud,
  FileCode,
  Image as ImageIcon,
  HelpCircle,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCheck,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  fileType: string;
  fileUrl?: string | null;
  rawText: string;
  createdAt: string;
}

export const KnowledgeBase: React.FC = () => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // FAQ Modal state
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqTitle, setFaqTitle] = useState('');
  const [faqContent, setFaqContent] = useState('');
  const [savingFaq, setSavingFaq] = useState(false);

  // Preview extracted text modal
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDoc | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/knowledge');
      setDocs(res.data);
    } catch (err) {
      console.error('Failed to load knowledge docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadTitle) {
      formData.append('title', uploadTitle);
    }

    try {
      await api.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadFile(null);
      setUploadTitle('');
      fetchDocs();
      alert('Document processed and indexed into AI Knowledge Base!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqTitle || !faqContent) return;

    setSavingFaq(true);
    try {
      await api.post('/knowledge/faq', {
        title: faqTitle,
        rawText: faqContent,
      });
      setFaqTitle('');
      setFaqContent('');
      setShowFaqModal(false);
      fetchDocs();
    } catch (err) {
      alert('Failed to save FAQ policy');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Remove "${title}" from AI Knowledge Base?`)) return;
    try {
      await api.delete(`/knowledge/${id}`);
      fetchDocs();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Knowledge Base (PDFs & Images)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload PDF menus, posters, images, and store rules. The AI parses the text and uses it to answer customer WhatsApp queries.
          </p>
        </div>

        <button
          onClick={() => setShowFaqModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          Add Store Policy / FAQ
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <form onSubmit={handleUploadFile} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
            <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-800">
              {uploadFile ? uploadFile.name : 'Upload PDF Menu, Image Poster, or Document'}
            </div>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Supported formats: <strong>.PDF, .PNG, .JPG, .JPEG, .TXT</strong> (up to 15MB)
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-2xs transition-colors">
              <span>Choose File</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                    if (!uploadTitle) {
                      setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
              />
            </label>
          </div>

          {uploadFile && (
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document Title (e.g. Catering Menu & Allergy Guide)"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                type="submit"
                disabled={uploading}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                {uploading ? 'Extracting & Indexing Text...' : 'Upload & Parse Document'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Indexed Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Indexed Documents ({docs.length})</h3>
          </div>
          <span className="text-[11px] text-slate-500">Live AI System Ingestion Active</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading knowledge base...</div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center">
            <FileCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No knowledge documents yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Upload a PDF or add a store policy to train your bot.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    {doc.fileType === 'pdf' ? (
                      <FileText className="w-4 h-4" />
                    ) : doc.fileType === 'image' ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <HelpCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{doc.title}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.fileType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {doc.rawText.slice(0, 140)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Text</span>
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Extracted Text Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{previewDoc.title}</h3>
                <span className="text-xs text-slate-500 uppercase font-mono">
                  Extracted {previewDoc.fileType} text
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {previewDoc.rawText}
            </div>
            <div className="p-3 border-t border-slate-200 bg-white text-right">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-3">Add Store Policy or FAQ</h3>
            <form onSubmit={handleCreateFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={faqTitle}
                  onChange={(e) => setFaqTitle(e.target.value)}
                  placeholder="e.g. Opening Hours & Holiday Schedule"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Content / Instructions for AI Bot
                </label>
                <textarea
                  rows={6}
                  required
                  value={faqContent}
                  onChange={(e) => setFaqContent(e.target.value)}
                  placeholder="Enter details here, e.g.:
- We are open daily from 11am to 11pm.
- Free parking available behind the building.
- Deliveries take 30-45 minutes. Cash and credit accepted."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFaq}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
                >
                  {savingFaq ? 'Saving...' : 'Save to Knowledge Base'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
