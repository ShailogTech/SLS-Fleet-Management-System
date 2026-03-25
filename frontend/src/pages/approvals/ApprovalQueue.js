import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  CheckCircle, XCircle, RefreshCw, AlertCircle, Truck, User,
  MessageSquare, FileText, Download, Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';

const ApprovalQueue = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [approvals, setApprovals] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const statusOrder = { pending: 0, checked: 1, rejected: 2, approved: 3 };

  useEffect(() => {
    fetchApprovals(true);
    const interval = setInterval(() => fetchApprovals(false), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { registerRefresh(() => fetchApprovals(false)); }, []);

  const fetchApprovals = async (showSpinner = false) => {
    if (showSpinner) setInitialLoading(true);
    try {
      const response = await api.get('/approvals/queue');
      const data = Array.isArray(response.data) ? response.data : [];
      data.sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      if (showSpinner) toast.error(error.response?.data?.detail || 'Failed to load approvals');
      if (showSpinner) setApprovals([]);
    } finally {
      if (showSpinner) setInitialLoading(false);
    }
  };

  const updateLocalApproval = (approvalId, newStatus) => {
    setApprovals(prev => {
      const updated = prev.map(a =>
        a.id === approvalId ? { ...a, status: newStatus } : a
      );
      updated.sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));
      return updated;
    });
  };

  const handleCheck = async (approvalId, action, comment) => {
    setProcessing(approvalId);
    try {
      await api.post(`/approvals/${approvalId}/check`, { action, comment });
      toast.success(action === 'approve' ? 'Reviewed and forwarded to Approver' : 'Rejected and returned to Maker');
      updateLocalApproval(approvalId, action === 'approve' ? 'checked' : 'rejected');
      fetchApprovals(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleApprove = async (approvalId, action, comment) => {
    setProcessing(approvalId);
    try {
      await api.post(`/approvals/${approvalId}/approve`, { action, comment });
      toast.success(action === 'approve' ? 'Approved and published!' : 'Rejected');
      updateLocalApproval(approvalId, action === 'approve' ? 'approved' : 'rejected');
      fetchApprovals(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleAdminAction = async (approvalId, action, comment) => {
    setProcessing(approvalId);
    try {
      await api.post(`/approvals/${approvalId}/admin-action`, { action, comment });
      toast.success(action === 'approve' ? 'Directly approved by Admin' : 'Rejected by Admin');
      updateLocalApproval(approvalId, action === 'approve' ? 'approved' : 'rejected');
      fetchApprovals(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const isAdmin = ['admin', 'superuser'].includes(user?.role);
  const isChecker = user?.role === 'checker';
  const isOperationalManager = user?.role === 'operational_manager';
  const isReviewer = isChecker || isOperationalManager;
  const isApprover = user?.role === 'approver';

  // Stats
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const checkedCount = approvals.filter(a => a.status === 'checked').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-6" data-testid="approval-queue-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Approval Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {isAdmin && 'Direct approve/reject or monitor approval workflow'}
            {isChecker && 'Review and verify submitted applications'}
            {isOperationalManager && 'Review and verify submitted applications'}
            {isApprover && 'Review checked applications for final approval'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchApprovals(false)} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Pending Review</p>
            {initialLoading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Awaiting Approval</p>
            {initialLoading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-blue-600">{checkedCount}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Approved</p>
            {initialLoading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Rejected</p>
            {initialLoading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="vehicle">Vehicles</SelectItem>
            <SelectItem value="driver">Drivers</SelectItem>
            <SelectItem value="profile_edit">Profile Edits</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="checked">Checked</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter !== 'all' || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {initialLoading && [1, 2, 3].map(i => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-6 space-y-3">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
        {!initialLoading && approvals
          .filter(a => typeFilter === 'all' || a.entity_type === typeFilter)
          .filter(a => statusFilter === 'all' || a.status === statusFilter)
          .map((approval) => (
          <Card key={approval.id} className="border-slate-200" data-testid={`approval-card-${approval.id}`}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    approval.entity_type === 'vehicle' ? 'bg-blue-100' :
                    approval.entity_type === 'profile_edit' ? 'bg-amber-100' : 'bg-purple-100'
                  }`}>
                    {approval.entity_type === 'vehicle' ? (
                      <Truck className="h-5 w-5 text-blue-600" />
                    ) : approval.entity_type === 'profile_edit' ? (
                      <FileText className="h-5 w-5 text-amber-600" />
                    ) : (
                      <User className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {approval.entity_type === 'profile_edit' ? 'PROFILE EDIT' : (approval.entity_type || 'UNKNOWN').toUpperCase()}:{' '}
                      {approval.entity_data?.vehicle_no || approval.entity_data?.user_name || approval.entity_data?.name || 'Record Not Found'}
                    </CardTitle>
                    {!approval.entity_data && (
                      <p className="text-xs text-amber-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" /> Original record may have been deleted
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={approval.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Submitted By</span>
                    <p className="font-medium text-slate-900">{approval.submitter?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Submitted At</span>
                    <p className="font-medium text-slate-900">{new Date(approval.created_at).toLocaleDateString()}</p>
                  </div>
                  {approval.entity_type === 'vehicle' && approval.entity_data && (
                    <>
                      <div>
                        <span className="text-slate-500">Owner</span>
                        <p className="font-medium text-slate-900">{approval.entity_data.owner_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Plant</span>
                        <p className="font-medium text-slate-900">{approval.entity_data.plant || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {approval.entity_type === 'driver' && approval.entity_data && (
                    <>
                      <div>
                        <span className="text-slate-500">Employee ID</span>
                        <p className="font-medium text-slate-900">{approval.entity_data.emp_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Plant</span>
                        <p className="font-medium text-slate-900">{approval.entity_data.plant || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {approval.entity_type === 'profile_edit' && approval.entity_data && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Role</span>
                      <p className="font-medium text-slate-900 capitalize">{approval.entity_data.user_role || 'N/A'}</p>
                    </div>
                  )}
                </div>
                {/* Profile edit: show requested changes */}
                {approval.entity_type === 'profile_edit' && approval.entity_data?.requested_data && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Requested Changes</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(approval.entity_data.requested_data).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                          <p className="font-medium text-slate-900">
                            <span className="line-through text-slate-400 mr-2">{approval.entity_data.current_data?.[key] || '—'}</span>
                            → {val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Documents */}
                {approval.documents && approval.documents.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Attached Documents ({approval.documents.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {approval.documents.map(doc => (
                        <div key={doc.id} className="flex items-center space-x-1 px-2 py-1 bg-white rounded border border-slate-200 text-xs">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span className="capitalize text-slate-700">{doc.document_type?.replace(/_/g, ' ')}</span>
                          {doc.file_url && (
                            <a href={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                              <Download className="h-3 w-3" />
                            </a>
                          )}
                          {!doc.file_url && <span className="text-amber-500">(no file)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer info */}
                {approval.checker_id && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <span className="text-blue-700 font-medium">Reviewed</span>
                    <span className="text-blue-600 ml-2">on {new Date(approval.checker_action_at).toLocaleString()}</span>
                    {approval.checker_comment && (
                      <p className="text-blue-600 mt-1 text-xs">Comment: {approval.checker_comment}</p>
                    )}
                  </div>
                )}

                {/* Admin direct action info */}
                {approval.admin_approved_by && (
                  <div className={`p-3 rounded-lg text-sm ${approval.status === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <span className={`font-medium ${approval.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {approval.status === 'approved' ? 'Directly Approved' : 'Rejected'} by {approval.admin_approved_by_name || 'Admin'}
                    </span>
                    <span className={`ml-2 ${approval.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                      on {new Date(approval.admin_action_at).toLocaleString()}
                    </span>
                    {approval.admin_action_comment && (
                      <p className={`mt-1 text-xs ${approval.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>Comment: {approval.admin_action_comment}</p>
                    )}
                  </div>
                )}

                {/* Approver info */}
                {approval.approver_id && (
                  <div className={`p-3 rounded-lg text-sm ${approval.status === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <span className={`font-medium ${approval.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {approval.status === 'approved' ? 'Approved' : 'Rejected by Approver'}
                    </span>
                    <span className={`ml-2 ${approval.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                      on {new Date(approval.approver_action_at).toLocaleString()}
                    </span>
                    {approval.approver_comment && (
                      <p className={`mt-1 text-xs ${approval.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>Comment: {approval.approver_comment}</p>
                    )}
                  </div>
                )}

                {/* Admin Comments */}
                {approval.admin_comments && approval.admin_comments.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Admin Queries</p>
                    {approval.admin_comments.map((c, i) => (
                      <div key={i} className="text-sm text-amber-800 mb-1 flex items-start space-x-2">
                        <MessageSquare className="h-3 w-3 mt-0.5 text-amber-500" />
                        <div>
                          <span className="font-medium">{c.by_name}:</span> {c.comment}
                          <span className="text-xs text-amber-500 ml-2">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reviewer Actions (Checker / Operational Manager) */}
                {approval.status === 'pending' && isReviewer && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <Textarea
                      placeholder="Add review comment (optional)..."
                      value={commentText[approval.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [approval.id]: e.target.value }))}
                      className="text-sm"
                      data-testid={`checker-comment-${approval.id}`}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        onClick={() => handleCheck(approval.id, 'approve', commentText[approval.id])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm"
                        disabled={processing === approval.id}
                        data-testid={`check-approve-${approval.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
                        {processing === approval.id ? 'Processing...' : 'Verify & Forward'}
                      </Button>
                      <Button
                        onClick={() => handleCheck(approval.id, 'reject', commentText[approval.id])}
                        variant="destructive"
                        className="text-xs sm:text-sm"
                        disabled={processing === approval.id}
                        data-testid={`check-reject-${approval.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1 sm:mr-2" />
                        Return to Maker
                      </Button>
                    </div>
                  </div>
                )}

                {/* Approver Actions */}
                {approval.status === 'checked' && isApprover && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <Textarea
                      placeholder="Add approval comment (optional)..."
                      value={commentText[approval.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [approval.id]: e.target.value }))}
                      className="text-sm"
                      data-testid={`approver-comment-${approval.id}`}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        onClick={() => handleApprove(approval.id, 'approve', commentText[approval.id])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm"
                        disabled={processing === approval.id}
                        data-testid={`final-approve-${approval.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
                        {processing === approval.id ? 'Processing...' : 'Approve & Publish'}
                      </Button>
                      <Button
                        onClick={() => handleApprove(approval.id, 'reject', commentText[approval.id])}
                        variant="destructive"
                        className="text-xs sm:text-sm"
                        disabled={processing === approval.id}
                        data-testid={`final-reject-${approval.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1 sm:mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin Actions — Direct Approve/Reject + Comment */}
                {isAdmin && approval.status !== 'approved' && approval.status !== 'rejected' && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <Textarea
                      placeholder="Add comment (optional)..."
                      value={commentText[approval.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [approval.id]: e.target.value }))}
                      className="text-sm"
                      data-testid={`admin-comment-input-${approval.id}`}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        onClick={() => handleAdminAction(approval.id, 'approve', commentText[approval.id])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm"
                        disabled={processing === approval.id}
                        data-testid={`admin-approve-${approval.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
                        {processing === approval.id ? 'Processing...' : 'Direct Approve'}
                      </Button>
                      <Button
                        onClick={() => handleAdminAction(approval.id, 'reject', commentText[approval.id])}
                        variant="destructive"
                        className="text-xs sm:text-sm"
                        disabled={processing === approval.id}
                        data-testid={`admin-reject-${approval.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1 sm:mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Final status display */}
                {approval.status === 'approved' && !approval.approver_id && (
                  <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700 font-medium">
                    Approved and Published
                  </div>
                )}
                {approval.status === 'rejected' && !approval.checker_id && !approval.approver_id && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700 font-medium">
                    Rejected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {!initialLoading && approvals
          .filter(a => typeFilter === 'all' || a.entity_type === typeFilter)
          .filter(a => statusFilter === 'all' || a.status === statusFilter)
          .length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No approvals found</p>
              <p className="text-sm mt-1">
                {(typeFilter !== 'all' || statusFilter !== 'all') ? 'Try adjusting your filters' : (
                  <>
                    {isReviewer && 'No items waiting for your review'}
                    {isApprover && 'No items waiting for your approval'}
                    {isAdmin && 'All items have been processed'}
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
