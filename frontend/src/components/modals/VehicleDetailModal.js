import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import StatusBadge from '../common/StatusBadge';
import TruckLoader from '../common/TruckLoader';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Truck, User, FileText, Calendar, MapPin, Edit2, Save, X,
  AlertTriangle, CheckCircle, Clock, UserPlus, Eye
} from 'lucide-react';

const VEHICLE_TYPES = [
  { value: 'tanker', label: 'Tanker' },
  { value: 'truck', label: 'Truck' },
  { value: 'hgv', label: 'HGV' },
  { value: 'other', label: 'Other' },
];

const VEHICLE_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'maintenance', label: 'Under Maintenance' },
];

const VehicleDetailModal = ({ isOpen, onClose, vehicleId, onUpdate }) => {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [plants, setPlants] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const canEdit = ['maker', 'admin', 'superuser', 'office_incharge'].includes(user?.role);

  const fetchVehicleDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/vehicles/${vehicleId}`);
      setVehicle(response.data);
      setEditData(response.data);
    } catch (error) {
      toast.error('Failed to load vehicle details');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [vehicleId, onClose]);

  const fetchUploadedDocs = useCallback(async () => {
    try {
      const response = await api.get(`/documents/vehicle/${vehicleId}`);
      setUploadedDocs(response.data);
    } catch (error) {
      console.error('Failed to load uploaded documents');
    }
  }, [vehicleId]);

  useEffect(() => {
    if (isOpen && vehicleId) {
      fetchVehicleDetails();
      fetchDrivers();
      fetchPlants();
      fetchUploadedDocs();
    }
  }, [isOpen, vehicleId, fetchVehicleDetails, fetchUploadedDocs]);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers?status=active');
      setDrivers(response.data);
    } catch (error) {
      console.error('Failed to load drivers');
    }
  };

  const fetchPlants = async () => {
    try {
      const response = await api.get('/plants');
      setPlants(response.data);
    } catch (error) {
      console.error('Failed to load plants');
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/vehicles/${vehicleId}`, editData);
      toast.success('Vehicle updated successfully');
      setIsEditing(false);
      fetchVehicleDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update vehicle');
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }
    try {
      await api.put(`/vehicles/${vehicleId}`, {
        ...editData,
        assigned_driver_id: selectedDriverId
      });
      toast.success('Driver assigned successfully');
      setShowAssignDriver(false);
      setSelectedDriverId('');
      fetchVehicleDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign driver');
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
          <TruckLoader />
        </DialogContent>
      </Dialog>
    );
  }

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="vehicle-detail-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">{vehicle.vehicle_no}</DialogTitle>
                <p className="text-sm text-slate-500">{vehicle.make} - {vehicle.vehicle_type || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={vehicle.status} />
              {canEdit && !isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  data-testid="edit-vehicle-btn"
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
                  <Button size="sm" onClick={handleSave} data-testid="save-vehicle-btn">
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
                <Label className="text-slate-500">Vehicle Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.vehicle_no || ''}
                    onChange={(e) => setEditData({ ...editData, vehicle_no: e.target.value })}
                    data-testid="edit-vehicle-no"
                  />
                ) : (
                  <p className="font-medium text-slate-900">{vehicle.vehicle_no}</p>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Owner Name</Label>
                {isEditing ? (
                  <Input
                    value={editData.owner_name || ''}
                    onChange={(e) => setEditData({ ...editData, owner_name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium text-slate-900">{vehicle.owner_name}</p>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Make</Label>
                {isEditing ? (
                  <Input
                    value={editData.make || ''}
                    onChange={(e) => setEditData({ ...editData, make: e.target.value })}
                  />
                ) : (
                  <p className="font-medium text-slate-900">{vehicle.make}</p>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Vehicle Type</Label>
                {isEditing ? (
                  <Select
                    value={editData.vehicle_type || ''}
                    onValueChange={(value) => setEditData({ ...editData, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium text-slate-900 capitalize">{vehicle.vehicle_type || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Chassis Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.chassis_no || ''}
                    onChange={(e) => setEditData({ ...editData, chassis_no: e.target.value })}
                  />
                ) : (
                  <p className="font-medium text-slate-900">{vehicle.chassis_no || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label className="text-slate-500">Engine Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.engine_no || ''}
                    onChange={(e) => setEditData({ ...editData, engine_no: e.target.value })}
                  />
                ) : (
                  <p className="font-medium text-slate-900">{vehicle.engine_no || 'N/A'}</p>
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
                      {VEHICLE_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={vehicle.status} />
                )}
              </div>
              <div>
                <Label className="text-slate-500">Plant</Label>
                {isEditing ? (
                  <Select
                    value={editData.plant || ''}
                    onValueChange={(value) => setEditData({ ...editData, plant: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.plant_name}>{plant.plant_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="font-medium text-slate-900">{vehicle.plant || 'Not Assigned'}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="pt-4">
            <div className="space-y-3">
              {(() => {
                // Friendly labels for document types
                const DOC_LABELS = {
                  rc: 'Registration Certificate (RC)',
                  insurance: 'Insurance',
                  fitness: 'Fitness Certificate (FC)',
                  tax: 'Tax Receipt',
                  puc: 'PUC Certificate',
                  permit: 'Permit',
                  national_permit: 'National Permit',
                };
                // Map inline expiry keys → doc type
                const EXPIRY_KEY_TO_TYPE = {
                  rc_expiry: 'rc', insurance_expiry: 'insurance', fitness_expiry: 'fitness',
                  tax_expiry: 'tax', puc_expiry: 'puc', permit_expiry: 'permit',
                  national_permit_expiry: 'national_permit',
                };

                // Build merged map keyed by document_type (one entry per type)
                const byType = {};

                // 1. Seed from inline vehicle.documents expiry dates
                if (vehicle.documents) {
                  Object.entries(vehicle.documents).forEach(([expiryKey, expiryDate]) => {
                    if (!expiryDate) return;
                    const docType = EXPIRY_KEY_TO_TYPE[expiryKey];
                    if (docType) {
                      byType[docType] = { expiry: expiryDate, fileUrl: null, docNumber: null };
                    }
                  });
                }

                // 2. Override/merge with uploaded docs (they have file info + more metadata)
                uploadedDocs.forEach(doc => {
                  const docType = doc.document_type;
                  if (!docType) return;
                  const existing = byType[docType];
                  byType[docType] = {
                    expiry: doc.expiry_date || (existing && existing.expiry) || null,
                    fileUrl: doc.file_url || null,
                    docNumber: doc.document_number || null,
                  };
                });

                const merged = Object.entries(byType);

                if (merged.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>No documents recorded</p>
                    </div>
                  );
                }

                const backendUrl = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

                return merged.map(([docType, item]) => {
                  const docStatus = getDocumentStatus(item.expiry);
                  const DocIcon = docStatus.icon;
                  const label = DOC_LABELS[docType] || docType.replace(/_/g, ' ');
                  const viewUrl = item.fileUrl ? `${backendUrl}${item.fileUrl}` : null;

                  return (
                    <div
                      key={docType}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        docStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
                        docStatus.status === 'expiring' ? 'bg-amber-50 border-amber-200' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className={`h-5 w-5 ${item.fileUrl ? 'text-blue-600' : 'text-slate-600'}`} />
                        <div>
                          <p className="font-medium text-slate-900">{label}</p>
                          <p className="text-sm text-slate-500">
                            {item.docNumber && <span>#{item.docNumber} &middot; </span>}
                            {item.expiry ? `Expires: ${new Date(item.expiry).toLocaleDateString()}` : 'No expiry date set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {viewUrl ? (
                          <a
                            href={viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No file</span>
                        )}
                        <div className="flex items-center space-x-1">
                          <DocIcon className={`h-5 w-5 ${docStatus.color}`} />
                          {docStatus.status === 'expired' && (
                            <span className="text-xs font-medium text-red-600">EXPIRED</span>
                          )}
                          {docStatus.status === 'expiring' && (
                            <span className="text-xs font-medium text-amber-600">{docStatus.days}d left</span>
                          )}
                          {docStatus.status === 'valid' && (
                            <span className="text-xs font-medium text-emerald-600">Valid</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="pt-4">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-500">Assigned Driver</p>
                      <p className="font-medium text-slate-900">
                        {vehicle.assigned_driver_name || 'Not Assigned'}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAssignDriver(!showAssignDriver)}
                      data-testid="assign-driver-btn"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {vehicle.assigned_driver_id ? 'Reassign' : 'Assign'} Driver
                    </Button>
                  )}
                </div>

                {showAssignDriver && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <Label>Select Driver</Label>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                          <SelectTrigger data-testid="driver-select">
                            <SelectValue placeholder="Choose a driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name} ({driver.emp_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAssignDriver} data-testid="confirm-assign-btn">
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
                    <p className="font-medium text-slate-900">{vehicle.plant || 'Not Assigned'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm text-slate-500">Active Tender</p>
                    <p className="font-medium text-slate-900">{vehicle.tender_name || 'Not Assigned'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p>Vehicle history will be displayed here</p>
              <p className="text-sm mt-1">Assignment changes, maintenance records, trips</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="close-modal-btn">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailModal;
