
import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search, ChevronLeft, ChevronRight, Flag, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
  };
  quiz?: {
    id: string;
    title: string;
    user: {
      id: string;
      username: string;
    };
  };
  reportedUser?: {
    id: string;
    username: string;
  };
}

const ITEMS_PER_PAGE = 10;

const ReportReasons: { [key: string]: string } = {
  'INAPPROPRIATE_CONTENT': 'Inappropriate Content',
  'SPAM': 'Spam',
  'PLAGIARISM': 'Plagiarism',
  'OFFENSIVE_LANGUAGE': 'Offensive Language',
  'CHEATING': 'Cheating/Unfair Advantage',
  'OTHER': 'Other',
};

const StatusColors: { [key: string]: string } = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'REVIEWING': 'bg-blue-100 text-blue-800',
  'RESOLVED': 'bg-green-100 text-green-800',
  'DISMISSED': 'bg-gray-100 text-gray-800',
};

interface ReportsTabProps {
  isActive: boolean;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ isActive }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  const pages = Math.max(1, Math.ceil(totalReports / ITEMS_PER_PAGE));

  useEffect(() => {
    fetchReports(page, searchTerm, statusFilter);
    // eslint-disable-next-line
  }, [page, searchTerm, statusFilter]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleStatusUpdate = async (id: string, status: string, action?: string) => {
    try {
      if (action === 'delete_quiz' && selectedReport?.quiz) {
        // Delete the quiz via admin API
        await api.delete(`/admin/quizzes/${selectedReport.quiz.id}`);
        toast.success('Quiz deleted');
      }
      // Update the report status (use /reports/:id/status, not /admin/reports/:id/status)
      await api.patch(`/reports/${id}/status`, { status, action });
      toast.success(`Status updated to ${status}`);
      setSelectedReport(null);
      // Refresh reports
      fetchReports(page, searchTerm, statusFilter);
    } catch (err) {
      toast.error('Failed to update report or delete quiz');
      console.error(err);
    }
  };

  async function fetchReports(pageNum: number = 1, search: string = '', status: string = '') {
    setLoading(true);
    try {
      const params: any = { page: pageNum };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get('/reports', { params });
      setReports(res.data.reports);
      setTotalReports(res.data.total || 0);
      setError('');
    } catch (err) {
      setError('Failed to fetch reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search reports by reason or user... (Press Enter)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-700 bg-gray-900 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Search
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleFilterChange('')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${statusFilter === '' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            All
          </button>
          {['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-gray-400">No reports found.</div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-2 shadow-lg hover:shadow-xl transition cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-center gap-2">
                <Flag className="text-amber-400" size={20} />
                <span className="font-black text-sm text-white">{ReportReasons[report.reason] || report.reason}</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${StatusColors[report.status]}`}>{report.status}</span>
              </div>
              <div className="text-xs text-gray-400">Reported by <span className="font-bold text-blue-400">{report.reporter.username}</span> {report.quiz && <>on <span className="font-bold text-purple-400">{report.quiz.title}</span></>}</div>
              <div className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-white">Page {page} of {pages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pages}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Details Panel */}
      <div className="mt-8">
        {selectedReport ? (
          <div className="bg-white border border-gray-300 rounded-lg p-6 sticky top-0">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" /> Report Details
            </h3>
            <div className="mb-2 text-gray-800">
              <div><b>Reason:</b> {ReportReasons[selectedReport.reason] || selectedReport.reason}</div>
              <div><b>Description:</b> {selectedReport.description}</div>
              <div><b>Status:</b> {selectedReport.status}</div>
              <div><b>Reported by:</b> {selectedReport.reporter.username}</div>
              {selectedReport.quiz && <div><b>Quiz:</b> {selectedReport.quiz.title}</div>}
              {selectedReport.reportedUser && <div><b>User:</b> {selectedReport.reportedUser.username}</div>}
              <div><b>Date:</b> {new Date(selectedReport.createdAt).toLocaleString()}</div>
            </div>
            <button
              onClick={() => handleStatusUpdate(selectedReport.id, 'REVIEWING')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition mb-2"
            >
              Mark as Reviewing
            </button>
            {selectedReport.quiz && (
              (
                selectedReport.status !== 'DISMISSED' && selectedReport.status !== 'RESOLVED' ? (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'RESOLVED', 'delete_quiz')}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition mb-2"
                    >
                      Delete Quiz & Resolve
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this quiz?')) {
                          await handleStatusUpdate(selectedReport.id, selectedReport.status, 'delete_quiz');
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 transition mb-2"
                    >
                      Delete Quiz
                    </button>
                  </>
                ) : null
              )
            )}
            {selectedReport.reportedUser && (
              <button
                onClick={() => handleStatusUpdate(selectedReport.id, 'RESOLVED', 'suspend_user')}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition mb-2"
              >
                Suspend User & Resolve
              </button>
            )}
            <button
              onClick={() => handleStatusUpdate(selectedReport.id, 'DISMISSED')}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
            >
              Dismiss Report
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 text-center text-gray-600">
            Select a report to view details
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
