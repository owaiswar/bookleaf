import React, { useState } from 'react';
import { X, Search, BookOpen, Banknote, Barcode, Printer, Truck, FileText, CheckCircle2 } from 'lucide-react';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'royalties' | 'isbn' | 'printing' | 'distribution' | 'production'>('all');

  if (!isOpen) return null;

  const sections = [
    {
      id: 'royalties',
      title: 'Royalties & Payments Policy',
      icon: <Banknote className="w-5 h-5 text-emerald-600" />,
      items: [
        'Authors receive 80% of net profit per book; BookLeaf receives 20%.',
        'Net profit = MRP - (Printing Cost + Platform Commission [Amazon/Flipkart] + Shipping Charges).',
        'Royalties are calculated quarterly and paid within 45 days of quarter-end.',
        'Quarter calendar: Q1 ends Mar 31 (paid by May 15), Q2 ends Jun 30 (paid by Aug 14), Q3 ends Sep 30 (paid by Nov 14), Q4 ends Dec 31 (paid by Feb 14).',
        'Minimum payout threshold is ₹1,000; amounts below threshold automatically roll over to the next quarter.',
        'Payouts are direct bank transfers (NEFT/IMPS) to the verified bank account linked in the Author Dashboard.',
        'Dashboard royalty breakdown shows platform-wise sales (Amazon, Flipkart, BookLeaf Store).'
      ]
    },
    {
      id: 'isbn',
      title: 'ISBN & Imprint Specifications',
      icon: <Barcode className="w-5 h-5 text-indigo-600" />,
      items: [
        'Each BookLeaf-published book is assigned a unique 13-digit ISBN registered under BookLeaf publisher imprint.',
        'Authors wanting an ISBN under their own imprint must procure and provide it independently before production begins.',
        'Duplicate/wrong ISBN or wrong-book mapping on retailer sites is treated as HIGH priority and escalated to production engineering immediately.',
        'Metadata updates (author bio, book summary) are synced to retail channels within 3–5 business days.'
      ]
    },
    {
      id: 'printing',
      title: 'Printing & Quality Assurance',
      icon: <Printer className="w-5 h-5 text-amber-600" />,
      items: [
        'Standard print turnaround is 5–7 business days from order confirmation.',
        'Most orders are printed in-house at our Delhi printing facility; overflow/special formats go to Repro India or Epitome Books.',
        'For verified misprints, binding defects, or color inconsistency, BookLeaf arranges a 100% free reprint.',
        'Authors must share clear photos or video clips of the defective copies for quality team verification.'
      ]
    },
    {
      id: 'distribution',
      title: 'Distribution Channels & Availability',
      icon: <Truck className="w-5 h-5 text-sky-600" />,
      items: [
        'Platforms: Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.',
        'New listings typically go live within 7–10 business days after publication is complete.',
        'Platform unavailability usually indicates a stock-sync issue between warehouse feeds and marketplace catalog.',
        'The operations team can trigger an expedited catalog re-sync within 24–48 hours.'
      ]
    },
    {
      id: 'production',
      title: 'Production Workflow Stages',
      icon: <BookOpen className="w-5 h-5 text-purple-600" />,
      items: [
        'Sequential stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.',
        'Authors receive automated milestone notification emails and portal updates at each stage transition.',
        'Most common delays: waiting for author approval at Cover Design and author revision rounds at Proofreading.',
        'Communication guidelines strictly mandate framing delays collaboratively and transparently without blaming the author.'
      ]
    }
  ];

  const filteredSections = sections.filter(sec => {
    if (activeTab !== 'all' && sec.id !== activeTab) return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      sec.title.toLowerCase().includes(query) ||
      sec.items.some(item => item.toLowerCase().includes(query))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">BookLeaf Knowledge Base & Policy Repository</h2>
              <p className="text-xs text-slate-500">Official ground-truth facts for support ticket resolution and AI response drafting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-6 border-b border-slate-200 bg-white space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search knowledge base policies, royalty timelines, ISBN rules, reprint criteria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: 'all', label: 'All Knowledge' },
              { id: 'royalties', label: 'Royalties & Payouts' },
              { id: 'isbn', label: 'ISBN & Imprint' },
              { id: 'printing', label: 'Printing & Quality' },
              { id: 'distribution', label: 'Distribution Channels' },
              { id: 'production', label: 'Production Stages' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No knowledge base items match "{search}".</p>
            </div>
          ) : (
            filteredSections.map(sec => (
              <div key={sec.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                  {sec.icon}
                  <h3>{sec.title}</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {sec.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>BookLeaf Standard Operating Procedures v2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
