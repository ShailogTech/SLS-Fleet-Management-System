import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Clock, CheckCircle, XCircle, RefreshCw, Truck, User,
  ArrowRight, FileText, Eye, AlertCircle, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import VehicleDetailModal from '../../components/modals/VehicleDetailModal';
import DriverDetailModal from '../../components/modals/DriverDetailModal';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Check',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-600',
    description: 'Waiting for reviewer'
  },
  checked: {
    label: 'Awaiting Approval',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
    iconColor: 'text-blue-600',
    description: 'Checked, waiting for final approval'
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    description: 'Approved and published'
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-600',
    description: 'Submission was rejected'
  }
};

const MySubmissions = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  useEffect(() => { registerRefresh(fetchMySubmissions); }, []);

  useEffect(() => {
    fetchMySubmissions();
    const interval = setInterval(fetchMySubmissions, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredSubmissions(submissions);
    } else {
      setFilteredSubmissions(submissions.filter(s => s.status === statusFilter));
    }
  }, [statusFilter, submissions]);

  const fetchMySubmissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/approvals/my-submissions');
      setSubmissions(response.data);
      setFilteredSubmissions(response.data);
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEntity = (submission) => {
    if (submission.entity_type === 'vehicle') {
      setSelectedVehicleId(submission.entity_id);
      setIsVehicleModalOpen(true);
    } else if (submission.entity_type === 'driver') {
      setSelectedDriverId(submission.entity_id);
      setIsDriverModalOpen(true);
    }
  };

  // Stats
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const checkedCount = submissions.filter(s => s.status === 'checked').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="my-submissions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            My Submissions
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Track the status of your submitted approvals</p>
        </div>
        <Button variant="outline" onClick={fetchMySubmissions} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Pending Check</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Awaiting Approval</p>
                <p className="text-2xl font-bold text-blue-600">{checkedCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submissions</SelectItem>
            <SelectItem value="pending">Pending Check</SelectItem>
            <SelectItem value="checked">Awaiting Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">
          Showing {filteredSubmissions.length} of {submissions.length} submissions
        </span>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.map((submission) => {
          const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card 
              key={submission.id} 
              className="border-slate-200 hover:shadow-md transition-shadow"
              data-testid={`submission-card-${submission.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Left side - Entity info */}
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${
                      submission.entity_type === 'vehicle' ? 'bg-blue-100' :
                      submission.entity_type === 'profile_edit' ? 'bg-amber-100' : 'bg-purple-100'
                    }`}>
                      {submission.entity_type === 'vehicle' ? (
                        <Truck className="h-6 w-6 text-blue-600" />
                      ) : submission.entity_type === 'profile_edit' ? (
                        <FileText className="h-6 w-6 text-amber-600" />
                      ) : (
                        <User className="h-6 w-6 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {submission.entity_type === 'vehicle' ? 'Vehicle' : submission.entity_type === 'profile_edit' ? 'Profile Edit' : 'Driver'}:{' '}
                          {submission.entity_data?.vehicle_no || submission.entity_data?.user_name || submission.entity_data?.name || 'N/A'}
                        </h3>
                        {!submission.entity_data && (
                          <span className="text-xs text-amber-600 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Record not found
                          </span>
                        )}
                      </div>
                      {submission.entity_data && (
                        <p className="text-sm text-slate-500 mt-1">
                          {submission.entity_type === 'vehicle'
                            ? `${submission.entity_data.make || ''} - ${submission.entity_data.owner_name || ''}`
                            : submission.entity_type === 'profile_edit'
                              ? `Requested changes to profile`
                              : `${submission.entity_data.emp_id || ''} - ${submission.entity_data.phone || ''}`
                          }
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Submitted on {new Date(submission.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Right side - Status */}
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                      <StatusIcon className={`h-4 w-4 mr-1 ${statusConfig.iconColor}`} />
                      {statusConfig.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">{statusConfig.description}</p>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    {/* Step 1: Submitted */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-2">Submitted</p>
                      <p className="text-xs text-slate-500">{submission.submitter_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-slate-300" />

                    {/* Step 2: Checked */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        submission.checker_id || submission.admin_approved_by
                          ? 'bg-emerald-100'
                          : submission.status === 'rejected' && !submission.checker_id
                            ? 'bg-red-100'
                            : 'bg-slate-100'
                      }`}>
                        {submission.checker_id || submission.admin_approved_by ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : submission.status === 'rejected' && !submission.approver_id ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-2">Checked</p>
                      <p className="text-xs text-slate-500">
                        {submission.admin_approved_by && !submission.checker_id
                          ? submission.admin_approved_by_name || 'Admin'
                          : submission.checker_name || (submission.checker_id ? 'Unknown' : '')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {submission.checker_action_at
                          ? new Date(submission.checker_action_at).toLocaleDateString()
                          : submission.admin_action_at
                            ? new Date(submission.admin_action_at).toLocaleDateString()
                            : 'Pending'
                        }
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-slate-300" />

                    {/* Step 3: Approved/Rejected */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        submission.status === 'approved'
                          ? 'bg-emerald-100'
                          : submission.status === 'rejected'
                            ? 'bg-red-100'
                            : 'bg-slate-100'
                      }`}>
                        {submission.status === 'approved' ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : submission.status === 'rejected' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-2">
                        {submission.status === 'rejected' ? 'Rejected' : 'Approved'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {submission.admin_approved_by
                          ? submission.admin_approved_by_name || 'Admin'
                          : submission.approver_name || (submission.approver_id ? 'Unknown' : '')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {submission.admin_action_at
                          ? new Date(submission.admin_action_at).toLocaleDateString()
                          : submission.approver_action_at
                            ? new Date(submission.approver_action_at).toLocaleDateString()
                            : 'Pending'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Edit: Requested Changes */}
                {submission.entity_type === 'profile_edit' && submission.entity_data?.requested_data && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Requested Changes</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(submission.entity_data.requested_data).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                          <p className="font-medium text-slate-900">
                            <span className="line-through text-slate-400 mr-2">{submission.entity_data.current_data?.[key] || '—'}</span>
                            → {val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments / Feedback Section */}
                {(submission.checker_comment || submission.approver_comment || (submission.admin_comments && submission.admin_comments.length > 0)) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center">
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Review Comments
                    </p>

                    {/* Checker comment */}
                    {submission.checker_comment && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-blue-700">Reviewer</span>
                          {submission.checker_action_at && (
                            <span className="text-xs text-blue-500">{new Date(submission.checker_action_at).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-sm text-blue-800">{submission.checker_comment}</p>
                      </div>
                    )}

                    {/* Approver comment */}
                    {submission.approver_comment && (
                      <div className={`p-3 rounded-lg border ${
                        submission.status === 'approved'
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${submission.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                            Approver
                          </span>
                          {submission.approver_action_at && (
                            <span className={`text-xs ${submission.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {new Date(submission.approver_action_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${submission.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                          {submission.approver_comment}
                        </p>
                      </div>
                    )}

                    {/* Admin direct action comment */}
                    {submission.admin_action_comment && (
                      <div className={`p-3 rounded-lg border ${
                        submission.status === 'approved'
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${submission.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {submission.status === 'approved' ? 'Directly Approved' : 'Rejected'} by {submission.admin_approved_by_name || 'Admin'}
                          </span>
                          {submission.admin_action_at && (
                            <span className={`text-xs ${submission.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {new Date(submission.admin_action_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${submission.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                          {submission.admin_action_comment}
                        </p>
                      </div>
                    )}

                    {/* Admin comments */}
                    {submission.admin_comments && submission.admin_comments.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Admin Queries</p>
                        {submission.admin_comments.map((c, i) => (
                          <div key={i} className="text-sm text-slate-700 mb-1.5 flex items-start space-x-2">
                            <MessageSquare className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{c.by_name}:</span> {c.comment}
                              <span className="text-xs text-slate-400 ml-2">{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* View Button */}
                {submission.entity_data && submission.entity_type !== 'profile_edit' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEntity(submission)}
                      data-testid={`view-entity-${submission.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View {submission.entity_type === 'vehicle' ? 'Vehicle' : 'Driver'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredSubmissions.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-semibold text-slate-900 mb-1">No submissions found</h3>
              <p className="text-sm text-slate-500">
                {statusFilter === 'all' 
                  ? "You haven't submitted anything for approval yet"
                  : `No submissions with status "${STATUS_CONFIG[statusFilter]?.label || statusFilter}"`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedVehicleId(null);
        }}
        vehicleId={selectedVehicleId}
      />

      {/* Driver Detail Modal */}
      <DriverDetailModal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setSelectedDriverId(null);
        }}
        driverId={selectedDriverId}
      />
    </div>
  );
};

export default MySubmissions;
