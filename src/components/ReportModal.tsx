import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'quiz' | 'user';
  targetId: string;
  targetName: string;
}

const REPORT_REASONS = [
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'PLAGIARISM', label: 'Plagiarism' },
  { value: 'OFFENSIVE_LANGUAGE', label: 'Offensive Language' },
  { value: 'CHEATING', label: 'Cheating/Unfair Advantage' },
  { value: 'OTHER', label: 'Other' }
];

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reason,
        description: description.trim()
      };

      if (targetType === 'quiz') {
        (payload as any).quizId = targetId;
      } else {
        (payload as any).reportedUserId = targetId;
      }

      await axios.post('/api/reports', payload);

      toast.success('Report submitted successfully. Thank you!');
      setReason('');
      setDescription('');
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to submit report';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300"></div>
      <div className="glass p-12 rounded-[3.5rem] border-amber-500/20 w-full max-w-md relative z-10 animate-in zoom-in duration-300 text-center space-y-8">
        {/* Icon */}
        <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 text-5xl mx-auto mb-4">
          <i className="bi bi-flag-fill"></i>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-4 text-center">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Report {targetType === 'quiz' ? 'Quiz' : 'User'}</h3>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Reporting</p>
              <p className="text-white font-black truncate">{targetName}</p>
            </div>
          </div>

          {/* Reason dropdown */}
          <div>
            <label className="block text-sm font-black text-white mb-2 uppercase tracking-wider">
              Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-black uppercase tracking-widest focus:outline-none focus:border-amber-500/50 transition-all cursor-pointer text-sm"
            >
              <option value="" className="bg-slate-900">Select a reason...</option>
              {REPORT_REASONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description textarea */}
          <div>
            <label className="block text-sm font-black text-white mb-2 uppercase tracking-wider">
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide any additional context..."
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none font-medium"
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {description.length}/500 characters
            </p>
          </div>

          {/* Privacy note */}
          <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/20">
            <p className="text-xs text-slate-400 font-medium">Your report will be reviewed by our moderation team. Please be honest and accurate.</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white/5 text-slate-400 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:text-white transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !reason}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
