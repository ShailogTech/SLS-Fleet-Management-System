import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, RefreshCw, AlertCircle, Truck, User,
  MessageSquare, FileText, Eye, Download, Send
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ApprovalQueue = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [showCommentFor, setShowCommentFor] = useState(null);

  useEffect(() => { fetchApprovals(); }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/approvals/queue');
      setApprovals(response.data);
    } catch (error) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async (approvalId, action, comment) => {
    setProcessing(approvalId);
    try {
      await api.post(`/approvals/${approvalId}/check`, { action, comment });
      toast.success(action === 'approve' ? 'Checked and forwarded to Approver' : 'Rejected and returned to Maker');
      fetchApprovals();
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
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleAdminComment = async (approvalId) => {
    const text = commentText[approvalId];
    if (!text?.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await api.post(`/approvals/${approvalId}/comment`, {
        comment: text,
        target_role: null
      });
      toast.success('Comment added');
      setCommentText(prev => ({ ...prev, [approvalId]: '' }));
      setShowCommentFor(null);
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const isAdmin = ['admin', 'superuser'].includes(user?.role);
  const isChecker = user?.role === 'checker';
  const isApprover = user?.role === 'approver';

  // Stats
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const checkedCount = approvals.filter(a => a.status === 'checked').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="approval-queue-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Approval Queue
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin && 'Monitoring approval workflow (read-only)'}
            {isChecker && 'Review and verify submitted applications'}
            {isApprover && 'Review checked applications for final approval'}
          </p>
        </div>
        <Button variant="outline" onClick={fetchApprovals} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Admin read-only notice */}
      {isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center space-x-3">
            <Eye className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              As Admin, you can monitor all approvals and add comments/queries to Checkers and Approvers, but cannot take approval actions directly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Pending Check</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Awaiting Approval</p>
            <p className="text-2xl font-bold text-blue-600">{checkedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.map((approval) => (
          <Card key={approval.id} className="border-slate-200" data-testid={`approval-card-${approval.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${approval.entity_type === 'vehicle' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    {approval.entity_type === 'vehicle' ? (
                      <Truck className="h-5 w-5 text-blue-600" />
                    ) : (
                      <User className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {approval.entity_type.toUpperCase()}: {approval.entity_data?.vehicle_no || approval.entity_data?.name || 'Record Not Found'}
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
                </div>

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

                {/* Checker info */}
                {approval.checker_id && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <span className="text-blue-700 font-medium">Checked</span>
                    <span className="text-blue-600 ml-2">on {new Date(approval.checker_action_at).toLocaleString()}</span>
                    {approval.checker_comment && (
                      <p className="text-blue-600 mt-1 text-xs">Comment: {approval.checker_comment}</p>
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

                {/* Checker Actions */}
                {approval.status === 'pending' && isChecker && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <Textarea
                      placeholder="Add review comment (optional)..."
                      value={commentText[approval.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [approval.id]: e.target.value }))}
                      className="text-sm"
                      data-testid={`checker-comment-${approval.id}`}
                    />
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleCheck(approval.id, 'approve', commentText[approval.id])}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={processing === approval.id}
                        data-testid={`check-approve-${approval.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === approval.id ? 'Processing...' : 'Verify & Forward to Approver'}
                      </Button>
                      <Button
                        onClick={() => handleCheck(approval.id, 'reject', commentText[approval.id])}
                        variant="destructive"
                        disabled={processing === approval.id}
                        data-testid={`check-reject-${approval.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
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
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleApprove(approval.id, 'approve', commentText[approval.id])}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={processing === approval.id}
                        data-testid={`final-approve-${approval.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === approval.id ? 'Processing...' : 'Final Approve & Publish'}
                      </Button>
                      <Button
                        onClick={() => handleApprove(approval.id, 'reject', commentText[approval.id])}
                        variant="destructive"
                        disabled={processing === approval.id}
                        data-testid={`final-reject-${approval.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin Comment Box */}
                {isAdmin && approval.status !== 'approved' && approval.status !== 'rejected' && (
                  <div className="pt-4 border-t border-slate-200">
                    {showCommentFor === approval.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add query or comment for checker/approver..."
                          value={commentText[approval.id] || ''}
                          onChange={e => setCommentText(prev => ({ ...prev, [approval.id]: e.target.value }))}
                          className="text-sm"
                          data-testid={`admin-comment-input-${approval.id}`}
                        />
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleAdminComment(approval.id)} data-testid={`admin-send-comment-${approval.id}`}>
                            <Send className="h-3 w-3 mr-1" /> Send Query
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowCommentFor(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCommentFor(approval.id)}
                        data-testid={`admin-add-comment-${approval.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Query / Comment
                      </Button>
                    )}
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

        {approvals.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No pending approvals</p>
              <p className="text-sm mt-1">
                {isChecker && 'No items waiting for your review'}
                {isApprover && 'No items waiting for your approval'}
                {isAdmin && 'All items have been processed'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
