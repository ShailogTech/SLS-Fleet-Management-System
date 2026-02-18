import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Clock, CheckCircle, XCircle, RefreshCw, Truck, User, 
  ArrowRight, FileText, Eye, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
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
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  useEffect(() => {
    fetchMySubmissions();
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-submissions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            My Submissions
          </h1>
          <p className="text-slate-600 mt-1">Track the status of your submitted approvals</p>
        </div>
        <Button variant="outline" onClick={fetchMySubmissions} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
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
                    <div className={`p-3 rounded-lg ${submission.entity_type === 'vehicle' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {submission.entity_type === 'vehicle' ? (
                        <Truck className="h-6 w-6 text-blue-600" />
                      ) : (
                        <User className="h-6 w-6 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {submission.entity_type === 'vehicle' ? 'Vehicle' : 'Driver'}: {' '}
                          {submission.entity_data?.vehicle_no || submission.entity_data?.name || 'N/A'}
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
                      <p className="text-xs text-slate-400">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-slate-300" />

                    {/* Step 2: Checked */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        submission.checker_id 
                          ? 'bg-emerald-100' 
                          : submission.status === 'rejected' && !submission.checker_id
                            ? 'bg-red-100'
                            : 'bg-slate-100'
                      }`}>
                        {submission.checker_id ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : submission.status === 'rejected' && !submission.approver_id ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-2">Checked</p>
                      <p className="text-xs text-slate-400">
                        {submission.checker_action_at 
                          ? new Date(submission.checker_action_at).toLocaleDateString()
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
                      <p className="text-xs text-slate-400">
                        {submission.approver_action_at 
                          ? new Date(submission.approver_action_at).toLocaleDateString()
                          : 'Pending'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* View Button */}
                {submission.entity_data && (
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
