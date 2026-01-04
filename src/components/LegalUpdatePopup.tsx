import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../api';
import { CURRENT_TOS_VERSION, CURRENT_PRIVACY_VERSION } from '../constants/legalVersions';

interface LegalUpdatePopupProps {
  user: {
    id: string;
    username: string;
    acceptedTosVersion?: string;
    acceptedPrivacyVersion?: string;
  };
  onAccept: () => void;
}

const LegalUpdatePopup: React.FC<LegalUpdatePopupProps> = ({ user, onAccept }) => {
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const needsTosUpdate = user.acceptedTosVersion !== CURRENT_TOS_VERSION;
  const needsPrivacyUpdate = user.acceptedPrivacyVersion !== CURRENT_PRIVACY_VERSION;

  // Don't show if both are up to date
  if (!needsTosUpdate && !needsPrivacyUpdate) {
    return null;
  }

  const handleAccept = async () => {
    if ((needsTosUpdate && !tosAccepted) || (needsPrivacyUpdate && !privacyAccepted)) {
      return;
    }

    setLoading(true);
    try {
      await userAPI.acceptLegalUpdates(CURRENT_TOS_VERSION, CURRENT_PRIVACY_VERSION);
      onAccept();
    } catch (error) {
      console.error('Failed to accept legal updates:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl text-blue-400 mx-auto mb-4">
            <i className="bi bi-file-earmark-text"></i>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">
            Legal Documents Updated
          </h2>
          <p className="text-slate-400">
            We've updated our legal documents. Please review and accept to continue using Quizly.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {needsTosUpdate && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Terms of Service</h3>
                  <p className="text-sm text-slate-400">
                    Updated to version {CURRENT_TOS_VERSION}
                  </p>
                </div>
                <Link 
                  to="/terms" 
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-2"
                >
                  Read <i className="bi bi-box-arrow-up-right"></i>
                </Link>
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-blue-500"
                />
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  I have read and accept the updated Terms of Service
                </span>
              </label>
            </div>
          )}

          {needsPrivacyUpdate && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Privacy Policy</h3>
                  <p className="text-sm text-slate-400">
                    Updated to version {CURRENT_PRIVACY_VERSION}
                  </p>
                </div>
                <Link 
                  to="/privacy" 
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-2"
                >
                  Read <i className="bi bi-box-arrow-up-right"></i>
                </Link>
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-blue-500"
                />
                <span className="text-slate-300 group-hover:text-white transition-colors">
                  I have read and accept the updated Privacy Policy
                </span>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={handleAccept}
          disabled={loading || (needsTosUpdate && !tosAccepted) || (needsPrivacyUpdate && !privacyAccepted)}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-4 rounded-2xl text-lg transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? 'Saving...' : 'Accept and Continue'}
        </button>

        <p className="text-center text-slate-500 text-sm mt-4">
          You must accept the updated documents to continue using Quizly
        </p>
      </div>
    </div>
  );
};

export default LegalUpdatePopup;
