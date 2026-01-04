import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <i className="bi bi-arrow-left"></i> Back
        </button>

        <h1 className="text-4xl sm:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
          Privacy Policy
        </h1>
        <p className="text-slate-400 mb-12">Last Updated: January 3, 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="mb-4">
              Quizly ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, and protect your personal information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.1 Account Information</h3>
            <p className="mb-4">When you create an account, we collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Username:</strong> Your unique username for identification</li>
              <li><strong>Password:</strong> Securely hashed and stored</li>
              <li><strong>Profile Picture:</strong> Optional image you upload</li>
              <li><strong>Account Creation Date:</strong> Timestamp of when you joined</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.2 Game and Usage Data</h3>
            <p className="mb-4">During your use of the Service, we collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Quiz Data:</strong> Quizzes you create, including titles, descriptions, questions, and answers</li>
              <li><strong>Game Statistics:</strong> Your scores, experience points (XP), coins, and level</li>
              <li><strong>Gameplay History:</strong> Records of games played, questions answered, and performance metrics</li>
              <li><strong>Play Count:</strong> Number of times your quizzes have been played</li>
              <li><strong>Preferences:</strong> Settings like profile visibility, quiz stats display, and anonymous mode</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.3 Session and Technical Data</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Session Cookies:</strong> To maintain your logged-in state (expires after 7 days)</li>
              <li><strong>Guest IDs:</strong> Temporary identifiers for users playing without accounts</li>
              <li><strong>WebSocket Connections:</strong> Real-time connection data for multiplayer games</li>
              <li><strong>IP Address:</strong> For security and server communication</li>
              <li><strong>Browser Information:</strong> For compatibility and Progressive Web App features</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.4 AI Service Data</h3>
            <p className="mb-4">When using AI quiz generation:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your quiz generation prompts are sent to Google Gemini AI API</li>
              <li>Generated content is returned and stored in your account</li>
              <li>Google's AI services may process this data according to their privacy policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Provide the Service:</strong> Enable account creation, quiz management, and gameplay</li>
              <li><strong>Authenticate Users:</strong> Verify your identity and maintain secure sessions</li>
              <li><strong>Track Progress:</strong> Store your XP, level, coins, and game statistics</li>
              <li><strong>Enable Multiplayer:</strong> Facilitate real-time game sessions with other players</li>
              <li><strong>Generate Content:</strong> Process AI quiz generation requests</li>
              <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance user experience</li>
              <li><strong>Security:</strong> Detect and prevent abuse, fraud, or unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Storage and Security</h2>
            <p className="mb-4">
              Your data is stored in a SQLite database on our servers. We implement security measures to protect 
              your information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Passwords are hashed using secure algorithms</li>
              <li>Session cookies are HTTP-only and secure in production</li>
              <li>Database access is restricted and authenticated</li>
              <li>WebSocket connections use secure protocols</li>
              <li>Guest player data is temporary and session-based</li>
            </ul>
            <p className="mt-4 text-amber-400">
              <strong>Note:</strong> While we take reasonable measures to protect your data, no system is completely secure. 
              Use strong passwords and protect your account credentials.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Data:</strong> Retained until you delete your account</li>
              <li><strong>Quiz Content:</strong> Stored indefinitely unless you delete it</li>
              <li><strong>Game Sessions:</strong> Inactive sessions deleted after 10 minutes</li>
              <li><strong>Session Cookies:</strong> Expire after 7 days or when you log out</li>
              <li><strong>Guest Data:</strong> Cleared when browser session ends or server restarts</li>
              <li><strong>All Game Sessions:</strong> Cleared on server restart</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Third-Party Services</h2>
            <p className="mb-4">We use the following third-party services:</p>
            
            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Google Gemini AI</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Used for AI-powered quiz generation</li>
              <li>Your prompts and generated content are processed by Google's servers</li>
              <li>Subject to Google's Privacy Policy and Terms of Service</li>
              <li>We do not control how Google processes this data</li>
            </ul>

            <p className="mt-4">
              We recommend reviewing Google's privacy policy at{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" 
                 className="text-blue-400 hover:text-blue-300 underline">
                policies.google.com/privacy
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies and Local Storage</h2>
            <p className="mb-4">We use cookies and browser storage for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Session Management:</strong> Keep you logged in (session cookie)</li>
              <li><strong>Guest Identification:</strong> Track guest players during games (sessionStorage)</li>
              <li><strong>Game State:</strong> Store temporary game data (sessionStorage)</li>
              <li><strong>Progressive Web App:</strong> Enable offline functionality (service worker cache)</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings. Disabling cookies may limit functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Data Sharing and Disclosure</h2>
            <p className="mb-4">We do not sell your personal information. We may share data in these cases:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Public Content:</strong> Public quizzes are visible to all users</li>
              <li><strong>Gameplay:</strong> Your username and scores are visible to other players during games</li>
              <li><strong>Profile Settings:</strong> Based on your privacy settings (profile visibility, anonymous mode)</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
              <li><strong>AI Processing:</strong> Quiz generation prompts sent to Google Gemini API</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Your Rights and Choices</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> View your account information and quiz data</li>
              <li><strong>Edit:</strong> Update your username, password, and profile picture</li>
              <li><strong>Delete:</strong> Remove your quizzes or delete your account entirely</li>
              <li><strong>Privacy Controls:</strong> Adjust profile visibility and anonymous mode settings</li>
              <li><strong>Quiz Visibility:</strong> Set quizzes to Public, Private, or Draft</li>
              <li><strong>Play as Guest:</strong> Use the Service without creating an account (limited features)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
            <p className="mb-4">
              Quizly is intended for general audiences. We do not knowingly collect personal information from 
              children under 13. If you believe we have collected information from a child under 13, please 
              contact us to have it removed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Progressive Web App (PWA)</h2>
            <p className="mb-4">
              Quizly functions as a Progressive Web App, which means:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The app can be installed on your device</li>
              <li>A service worker caches resources for offline functionality</li>
              <li>Cached data is stored locally on your device</li>
              <li>You can clear cached data through your browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. International Users</h2>
            <p className="mb-4">
              Quizly may be accessed from various countries. By using the Service, you consent to the transfer 
              and processing of your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify users of significant changes 
              through the Service. Continued use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact Us</h2>
            <p className="mb-4">
              If you have questions or concerns about this Privacy Policy or how we handle your data, please 
              contact us through the appropriate channels provided in the application.
            </p>
          </section>

          <section className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Summary</h2>
            <p className="mb-4">In short, we:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Collect account info, quiz data, and gameplay statistics</li>
              <li>Use Google Gemini AI for quiz generation</li>
              <li>Store data securely with hashed passwords</li>
              <li>Don't sell your personal information</li>
              <li>Clear inactive game sessions automatically</li>
              <li>Give you control over your data and privacy settings</li>
              <li>Use cookies for sessions and PWA functionality</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-slate-500 text-sm text-center">
            By using Quizly, you acknowledge that you have read and understood this Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
