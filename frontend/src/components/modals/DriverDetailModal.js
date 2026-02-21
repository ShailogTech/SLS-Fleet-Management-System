import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import StatusBadge from '../common/StatusBadge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Truck, FileText, Calendar, Phone, CreditCard, Edit2, Save, X,
  AlertTriangle, CheckCircle, Clock, MapPin, Trash2
} from 'lucide-react';

const DRIVER_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'on_leave', label: 'On Leave' },
];

const DriverDetailModal = ({ isOpen, onClose, driverId, onUpdate }) => {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showAssignVehicle, setShowAssignVehicle] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const canEdit = ['maker', 'admin', 'superuser', 'office_incharge'].includes(user?.role);
  const canDelete = ['admin', 'superuser'].includes(user?.role);

  const fetchDriverDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/drivers/${driverId}`);
      setDriver(response.data);
      setEditData(response.data);
    } catch (error) {
      toast.error('Failed to load driver details');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [driverId, onClose]);

  useEffect(() => {
    if (isOpen && driverId) {
      fetchDriverDetails();
      fetchVehicles();
    }
  }, [isOpen, driverId, fetchDriverDetails]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles?status=active');
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to load vehicles');
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/drivers/${driverId}`, editData);
      toast.success('Driver updated successfully');
      setIsEditing(false);
      fetchDriverDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update driver');
    }
  };

  const handleAssignVehicle = async () => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }
    try {
      await api.put(`/drivers/${driverId}`, { 
        ...editData, 
        allocated_vehicle: selectedVehicleId 
      });
      toast.success('Vehicle assigned successfully');
      setShowAssignVehicle(false);
      setSelectedVehicleId('');
      fetchDriverDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign vehicle');
    }
  };

  const handleDeleteDriver = async () => {
    if (!window.confirm(`Are you sure you want to delete driver "${driver.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/drivers/${driverId}`);
      toast.success('Driver deleted successfully');
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete driver');
    }
  };

  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', icon: Clock, color: 'text-slate-400' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', icon: AlertTriangle, color: 'text-red-600', days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', icon: Clock, color: 'text-amber-600', days: daysUntilExpiry };
    }
    return { status: 'valid', icon: CheckCircle, color: 'text-emerald-600', days: daysUntilExpiry };
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!driver) return null;

  const dlStatus = getDocumentStatus(driver.dl_expiry);
  const hazardousStatus = getDocumentStatus(driver.hazardous_cert_expiry);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="driver-detail-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">{driver.name}</DialogTitle>
                <p className="text-sm text-slate-500">Employee ID: {driver.emp_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={driver.status} />
              {canEdit && !isEditing && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                  data-testid="edit-driver-btn"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} data-testid="save-driver-btn">
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="assignment" data-testid="tab-assignment">Assignment</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500">Full Name</Label>
                {isEditing ? (
                  <Input
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    data-testid="edit-driver-name"
                  />
                ) : (
                  <p className="font-medium text-slate-900">{driver.name}</p>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Employee ID</Label>
                <p className="font-medium text-slate-900">{driver.emp_id}</p>
              </div>
              <div>
                <Label className="text-slate-500">Phone Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="font-medium text-slate-900">{driver.phone}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-500">DL Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.dl_no || ''}
                    onChange={(e) => setEditData({ ...editData, dl_no: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="font-medium text-slate-900">{driver.dl_no}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Status</Label>
                {isEditing ? (
                  <Select 
                    value={editData.status || ''} 
                    onValueChange={(value) => setEditData({ ...editData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRIVER_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={driver.status} />
                )}
              </div>
              <div>
                <Label className="text-slate-500">Plant</Label>
                {isEditing ? (
                  <Input
                    value={editData.plant || ''}
                    onChange={(e) => setEditData({ ...editData, plant: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="font-medium text-slate-900">{driver.plant || 'Not Assigned'}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-500">DL Expiry Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editData.dl_expiry || ''}
                    onChange={(e) => setEditData({ ...editData, dl_expiry: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {driver.dl_expiry ? new Date(driver.dl_expiry).toLocaleDateString() : 'Not Set'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Hazardous Certificate Expiry</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editData.hazardous_cert_expiry || ''}
                    onChange={(e) => setEditData({ ...editData, hazardous_cert_expiry: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {driver.hazardous_cert_expiry ? new Date(driver.hazardous_cert_expiry).toLocaleDateString() : 'Not Set'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="pt-4">
            <div className="space-y-3">
              {/* DL Document */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  dlStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
                  dlStatus.status === 'expiring' ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}
                data-testid="doc-dl"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Driving License</p>
                    <p className="text-sm text-slate-500">
                      {driver.dl_expiry ? `Expires: ${new Date(driver.dl_expiry).toLocaleDateString()}` : 'No expiry date set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <dlStatus.icon className={`h-5 w-5 ${dlStatus.color}`} />
                  {dlStatus.status === 'expired' && (
                    <span className="text-xs font-medium text-red-600">EXPIRED</span>
                  )}
                  {dlStatus.status === 'expiring' && (
                    <span className="text-xs font-medium text-amber-600">{dlStatus.days} days left</span>
                  )}
                  {dlStatus.status === 'valid' && (
                    <span className="text-xs font-medium text-emerald-600">Valid</span>
                  )}
                </div>
              </div>

              {/* Hazardous Certificate */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  hazardousStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
                  hazardousStatus.status === 'expiring' ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}
                data-testid="doc-hazardous"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Hazardous Goods Certificate</p>
                    <p className="text-sm text-slate-500">
                      {driver.hazardous_cert_expiry ? `Expires: ${new Date(driver.hazardous_cert_expiry).toLocaleDateString()}` : 'No expiry date set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <hazardousStatus.icon className={`h-5 w-5 ${hazardousStatus.color}`} />
                  {hazardousStatus.status === 'expired' && (
                    <span className="text-xs font-medium text-red-600">EXPIRED</span>
                  )}
                  {hazardousStatus.status === 'expiring' && (
                    <span className="text-xs font-medium text-amber-600">{hazardousStatus.days} days left</span>
                  )}
                  {hazardousStatus.status === 'valid' && (
                    <span className="text-xs font-medium text-emerald-600">Valid</span>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="pt-4">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-500">Allocated Vehicle</p>
                      <p className="font-medium text-slate-900">
                        {driver.allocated_vehicle || 'Not Assigned'}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowAssignVehicle(!showAssignVehicle)}
                      data-testid="assign-vehicle-btn"
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      {driver.allocated_vehicle ? 'Reassign' : 'Assign'} Vehicle
                    </Button>
                  )}
                </div>

                {showAssignVehicle && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <Label>Select Vehicle</Label>
                        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                          <SelectTrigger data-testid="vehicle-select">
                            <SelectValue placeholder="Choose a vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.vehicle_no}>
                                {vehicle.vehicle_no} - {vehicle.make}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAssignVehicle} data-testid="confirm-vehicle-btn">
                        Confirm Assignment
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm text-slate-500">Current Plant</p>
                    <p className="font-medium text-slate-900">{driver.plant || 'Not Assigned'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p>Driver history will be displayed here</p>
              <p className="text-sm mt-1">Vehicle assignments, trips, attendance records</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t border-slate-200 mt-4">
          <div>
            {canDelete && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleDeleteDriver}
                data-testid="delete-driver-btn"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove Driver
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose} data-testid="close-modal-btn">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverDetailModal;
