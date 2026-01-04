import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
          Terms of Service
        </h1>
        <p className="text-slate-400 mb-12">Last Updated: January 3, 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing or using Quizly ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="mb-4">
              Quizly is a multiplayer quiz game platform that allows users to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Create and customize quiz games</li>
              <li>Play quizzes in solo or multiplayer mode</li>
              <li>Generate quizzes using AI technology (Google Gemini)</li>
              <li>Browse and play community-created quizzes</li>
              <li>Track progress through experience points, levels, and coins</li>
              <li>Participate in real-time multiplayer game sessions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
            <p className="mb-4">
              To access certain features, you may need to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Not share your account credentials with others</li>
            </ul>
            <p className="mt-4">
              Guest users can play quizzes without an account but will not have access to profile features, 
              quiz creation, or progress tracking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. User-Generated Content</h2>
            <p className="mb-4">
              When you create quizzes or submit content:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You retain ownership of your content</li>
              <li>You grant Quizly a license to display and distribute your content within the Service</li>
              <li>You are responsible for the accuracy and legality of your content</li>
              <li>You agree not to upload content that infringes on others' rights</li>
            </ul>
            <p className="mt-4">
              Quiz visibility settings:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Public:</strong> Visible to all users and can be played by anyone</li>
              <li><strong>Private:</strong> Only visible and playable by you</li>
              <li><strong>Draft:</strong> Unpublished quizzes that cannot be hosted in games</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. AI-Generated Content</h2>
            <p className="mb-4">
              Quizly uses Google Gemini AI to generate quiz content. You acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>AI-generated content may contain errors or inaccuracies</li>
              <li>You are responsible for reviewing and editing AI-generated quizzes before publishing</li>
              <li>Quizly does not guarantee the accuracy of AI-generated content</li>
              <li>Your prompts and generated content may be processed by Google's AI services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Prohibited Conduct</h2>
            <p className="mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the Service for any illegal purpose</li>
              <li>Create content that is offensive, defamatory, or violates others' rights</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Upload malicious code or interfere with the Service's operation</li>
              <li>Use automated systems (bots) to access the Service without permission</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Collect or harvest users' personal information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
            <p className="mb-4">
              The Service, including its design, features, and code, is owned by Quizly and is protected by 
              intellectual property laws. You may not copy, modify, or reverse engineer any part of the Service 
              without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Game Sessions and Data</h2>
            <p className="mb-4">
              Game sessions operate under the following rules:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Game sessions become unjoinable once the game starts</li>
              <li>Inactive game sessions are automatically deleted after 10 minutes</li>
              <li>All game sessions are cleared when the server restarts</li>
              <li>Real-time gameplay data is transmitted via WebSocket connections</li>
              <li>Game results and statistics may be stored for registered users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimer of Warranties</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
              WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUIZLY SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Termination</h2>
            <p className="mb-4">
              We reserve the right to suspend or terminate your account at any time for violation of these 
              terms or for any other reason. You may delete your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Changes to Terms</h2>
            <p className="mb-4">
              We may modify these Terms of Service at any time. Continued use of the Service after changes 
              constitutes acceptance of the modified terms. We will notify users of significant changes through 
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law</h2>
            <p className="mb-4">
              These terms are governed by applicable laws. Any disputes shall be resolved in accordance with 
              the laws of your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact</h2>
            <p className="mb-4">
              If you have questions about these Terms of Service, please contact us through the appropriate 
              channels provided in the application.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-slate-500 text-sm text-center">
            By using Quizly, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
