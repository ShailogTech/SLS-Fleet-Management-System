import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../../contexts/RefreshContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import TruckLoader from '../../components/common/TruckLoader';
import { 
  UserPlus, Check, X, Clock, User, Mail, Phone, Calendar, 
  RefreshCw, Shield, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const ALL_ROLES = [
  { value: 'driver', label: 'Driver' },
  { value: 'maker', label: 'Maker' },
  { value: 'operational_manager', label: 'Operational Manager' },
  { value: 'accounts_manager', label: 'Accounts Manager' },
  { value: 'checker', label: 'Checker' },
  { value: 'approver', label: 'Approver' },
  { value: 'admin', label: 'Admin', requiresSuperuser: true },
  { value: 'office_incharge', label: 'Office Incharge' },
  { value: 'plant_incharge', label: 'Plant Incharge' },
  { value: 'records_incharge', label: 'Records Incharge' },
  { value: 'viewer', label: 'Viewer' },
];

const SignupRequests = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isSuperuser = currentUser?.role === 'superadmin';
  const ROLES = ALL_ROLES.filter(r => !r.requiresSuperuser || isSuperuser);
  const { registerRefresh } = useRefresh();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [availablePlants, setAvailablePlants] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => { registerRefresh(fetchRequests); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/signup-requests');
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to load signup requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlants = async () => {
    try {
      const res = await api.get('/users/available-plants');
      setAvailablePlants(res.data.available || []);
    } catch (error) {
      console.log('Failed to load available plants');
    }
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setSelectedRole('');
    setSelectedPlant('');
    setIsApproveModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }
    if (selectedRole === 'plant_incharge' && !selectedPlant) {
      toast.error('Please assign a plant for Plant Incharge');
      return;
    }

    setProcessing(true);
    try {
      let url = `/auth/signup-requests/${selectedRequest.id}/approve?role=${selectedRole}`;
      if (selectedRole === 'plant_incharge' && selectedPlant) {
        url += `&plant=${encodeURIComponent(selectedPlant)}`;
      }
      // If driver role, redirect to Add Driver page FIRST (don't approve yet)
      if (selectedRole === 'driver') {
        setIsApproveModalOpen(false);
        const params = new URLSearchParams({
          name: selectedRequest.name,
          phone: selectedRequest.phone,
          signup_request_id: selectedRequest.id,
        });
        toast.info('Complete driver details and upload documents to finish approval.');
        navigate(`/drivers/new?${params.toString()}`);
        return;
      }

      await api.post(url);
      toast.success('User approved and activated successfully');
      setIsApproveModalOpen(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this signup request?')) {
      return;
    }

    try {
      await api.post(`/auth/signup-requests/${requestId}/reject`);
      toast.success('Signup request rejected');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject request');
    }
  };

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="signup-requests-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Signup Requests
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Review and approve new user registrations</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Requests</p>
                <p className="text-2xl font-bold text-amber-600">{requests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card 
              key={request.id} 
              className="border-slate-200 hover:shadow-md transition-shadow"
              data-testid={`request-card-${request.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-slate-100 p-3 rounded-full">
                      <UserPlus className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{request.name}</h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-slate-600">
                          <Mail className="h-4 w-4 mr-2 text-slate-400" />
                          {request.email}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="h-4 w-4 mr-2 text-slate-400" />
                          {request.phone}
                        </div>
                        <div className="flex items-center text-sm text-slate-500">
                          <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                          Submitted: {new Date(request.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                      PENDING
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(request.id)}
                      data-testid={`reject-btn-${request.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApproveClick(request)}
                      data-testid={`approve-btn-${request.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-900 mb-1">No Pending Requests</h3>
            <p className="text-sm text-slate-500">All signup requests have been processed</p>
          </CardContent>
        </Card>
      )}

      {/* Approve Modal */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="max-w-md" data-testid="approve-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-emerald-600" />
              Assign Role & Approve
            </DialogTitle>
            <DialogDescription>
              Select a role for this user. They will be able to login immediately after approval.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-200 p-2 rounded-full">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedRequest.name}</p>
                    <p className="text-sm text-slate-500">{selectedRequest.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Assign Role *</Label>
                <Select value={selectedRole} onValueChange={(value) => {
                  setSelectedRole(value);
                  setSelectedPlant('');
                  if (value === 'plant_incharge') fetchAvailablePlants();
                }}>
                  <SelectTrigger className="mt-1" data-testid="role-select">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  The user will be able to login immediately after approval
                </p>
              </div>

              {selectedRole === 'plant_incharge' && (
                <div>
                  <Label>Assign Plant *</Label>
                  <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlants.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                      {availablePlants.length === 0 && (
                        <SelectItem value="__none" disabled>
                          No plants available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-600 mt-2 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Only plants without an existing Plant Incharge are shown
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setIsApproveModalOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={processing || !selectedRole || (selectedRole === 'plant_incharge' && !selectedPlant)}
                  data-testid="confirm-approve-btn"
                >
                  {processing ? 'Processing...' : 'Approve & Activate'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignupRequests;
