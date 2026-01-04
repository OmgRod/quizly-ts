import React, { useState, useEffect } from 'react';
import { api } from '../api';
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
  'OTHER': 'Other'
};

const StatusColors: { [key: string]: string } = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'REVIEWING': 'bg-blue-100 text-blue-800',
  'RESOLVED': 'bg-green-100 text-green-800',
  'DISMISSED': 'bg-gray-100 text-gray-800'
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

  const fetchReports = async (pageNum: number = 1, search: string = '', status: string = '') => {
    setLoading(true);
    try {
      const params: any = { page: pageNum };
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await axios.get('/api/reports', { params });
      setReports(res.data.reports);
      setTotalReports(res.data.total || 0);
      setError('');
    } catch (err) {
      setError('Failed to fetch reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchReports(1, searchTerm, statusFilter);
    }
  }, [isActive]);

  const handleSearch = () => {
    setPage(1);
    fetchReports(1, searchInput, statusFilter);
    setSearchTerm(searchInput);
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
    fetchReports(1, searchTerm, status);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: string, action?: string) => {
    try {
      const res = await api.patch(`/reports/${reportId}/status`, {
        status: newStatus,
        action
      });
      setReports(reports.map(r => r.id === reportId ? res.data : r));
      if (selectedReport?.id === reportId) {
        setSelectedReport(res.data);
      }
      toast.success(`Report status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update report');
    }
  };

  const pages = Math.ceil(totalReports / ITEMS_PER_PAGE);

  if (!isActive) return null;

  return (
    <div>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              statusFilter === '' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No reports found</div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedReport?.id === report.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Flag size={16} className="text-amber-600" />
                      <span className="font-semibold text-gray-900">
                        {report.quiz ? `Quiz: ${report.quiz.title}` : `User: ${report.reportedUser?.username}`}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${StatusColors[report.status] || 'bg-gray-100'}`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <p>By: {report.reporter.username}</p>
                    <p>Reason: {ReportReasons[report.reason] || report.reason}</p>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setPage(page - 1);
                  fetchReports(page - 1, searchTerm, statusFilter);
                }}
                disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={20} /> Previous
              </button>
              <span className="text-gray-600 font-semibold">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => {
                  setPage(page + 1);
                  fetchReports(page + 1, searchTerm, statusFilter);
                }}
                disabled={page === pages}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div>
          {selectedReport ? (
            <div className="bg-white border border-gray-300 rounded-lg p-6 sticky top-0">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600" /> Report Details
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500 font-semibold">Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${StatusColors[selectedReport.status]}`}>
                    {selectedReport.status}
                  </span>
                </div>

                <div>
                  <p className="text-gray-500 font-semibold">Reported By</p>
                  <p className="text-gray-900">{selectedReport.reporter.username}</p>
                </div>

                <div>
                  <p className="text-gray-500 font-semibold">Reason</p>
                  <p className="text-gray-900">{ReportReasons[selectedReport.reason] || selectedReport.reason}</p>
                </div>

                {selectedReport.description && (
                  <div>
                    <p className="text-gray-500 font-semibold">Description</p>
                    <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">{selectedReport.description}</p>
                  </div>
                )}

                {selectedReport.quiz && (
                  <div>
                    <p className="text-gray-500 font-semibold">Quiz</p>
                    <p className="text-gray-900">{selectedReport.quiz.title}</p>
                    <p className="text-gray-600 text-xs">By: {selectedReport.quiz.user.username}</p>
                  </div>
                )}

                {selectedReport.reportedUser && (
                  <div>
                    <p className="text-gray-500 font-semibold">Reported User</p>
                    <p className="text-gray-900">{selectedReport.reportedUser.username}</p>
                  </div>
                )}

                <div>
                  <p className="text-gray-500 font-semibold">Date</p>
                  <p className="text-gray-900">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              {selectedReport.status !== 'RESOLVED' && selectedReport.status !== 'DISMISSED' && (
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => handleStatusUpdate(selectedReport.id, 'REVIEWING')}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
                  >
                    Mark as Reviewing
                  </button>
                  {selectedReport.quiz && (
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'RESOLVED', 'delete_quiz')}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
                    >
                      Delete Quiz & Resolve
                    </button>
                  )}
                  {selectedReport.reportedUser && (
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'RESOLVED', 'suspend_user')}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
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
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 text-center text-gray-600">
              Select a report to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
