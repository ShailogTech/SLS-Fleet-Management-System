import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Edit2, Calendar, FileText, Building, Truck, Eye, Search, RefreshCw, X, Check, AlertTriangle } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';

const TenderManagement = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [tenders, setTenders] = useState([]);
  const [filteredTenders, setFilteredTenders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTender, setEditingTender] = useState(null);
  const [selectedTender, setSelectedTender] = useState(null);
  
  const [formData, setFormData] = useState({
    tender_name: '',
    tender_no: '',
    client: '',
    start_date: '',
    end_date: '',
    contract_type: '',
    plant: '',
    sd_number: '',
    sd_value: '',
    sd_bank: '',
    bg_number: '',
    bg_value: '',
    bg_bank: '',
    assigned_vehicles: [],
  });

  useEffect(() => {
    fetchTenders();
    fetchVehicles();
  }, []);

  useEffect(() => { registerRefresh(fetchTenders); }, []);

  useEffect(() => {
    let filtered = tenders;
    
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.tender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tender_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.client?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    setFilteredTenders(filtered);
  }, [searchTerm, statusFilter, tenders]);

  const fetchTenders = async () => {
    try {
      const response = await api.get('/tenders');
      setTenders(response.data);
      setFilteredTenders(response.data);
    } catch (error) {
      toast.error('Failed to load tenders');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to load vehicles');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTender) {
        await api.put(`/tenders/${editingTender.id}`, formData);
        toast.success('Tender updated successfully');
      } else {
        await api.post('/tenders', formData);
        toast.success('Tender created successfully');
      }
      
      setIsFormModalOpen(false);
      resetForm();
      fetchTenders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (tender) => {
    setEditingTender(tender);
    setFormData({
      tender_name: tender.tender_name,
      tender_no: tender.tender_no,
      client: tender.client,
      start_date: tender.start_date?.split('T')[0] || tender.start_date,
      end_date: tender.end_date?.split('T')[0] || tender.end_date,
      contract_type: tender.contract_type || '',
      plant: tender.plant || '',
      sd_number: tender.sd_number || '',
      sd_value: tender.sd_value || '',
      sd_bank: tender.sd_bank || '',
      bg_number: tender.bg_number || '',
      bg_value: tender.bg_value || '',
      bg_bank: tender.bg_bank || '',
      assigned_vehicles: tender.assigned_vehicles || [],
    });
    setIsFormModalOpen(true);
  };

  const handleViewTender = (tender) => {
    setSelectedTender(tender);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (tenderId, newStatus) => {
    try {
      const tender = tenders.find(t => t.id === tenderId);
      await api.put(`/tenders/${tenderId}`, { ...tender, status: newStatus });
      toast.success(`Tender ${newStatus === 'active' ? 'activated' : 'closed'}`);
      fetchTenders();
    } catch (error) {
      toast.error('Failed to update tender status');
    }
  };

  const handleDeleteTender = async (tenderId) => {
    if (!window.confirm('Are you sure you want to delete this tender?')) return;
    try {
      await api.delete(`/tenders/${tenderId}`);
      toast.success('Tender deleted successfully');
      setIsDetailModalOpen(false);
      fetchTenders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete tender');
    }
  };

  const handleAssignVehicle = (vehicleNo) => {
    const current = formData.assigned_vehicles || [];
    if (!current.includes(vehicleNo)) {
      setFormData({ ...formData, assigned_vehicles: [...current, vehicleNo] });
    }
  };

  const handleRemoveVehicle = (vehicleNo) => {
    const current = formData.assigned_vehicles || [];
    setFormData({ ...formData, assigned_vehicles: current.filter(v => v !== vehicleNo) });
  };

  const resetForm = () => {
    setFormData({
      tender_name: '',
      tender_no: '',
      client: '',
      start_date: '',
      end_date: '',
      contract_type: '',
      plant: '',
      sd_number: '',
      sd_value: '',
      sd_bank: '',
      bg_number: '',
      bg_value: '',
      bg_bank: '',
      assigned_vehicles: [],
    });
    setEditingTender(null);
  };

  const openNewTenderModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const canCreate = ['maker', 'admin', 'superuser', 'office_incharge'].includes(user?.role);
  const canDelete = ['admin', 'superuser'].includes(user?.role);

  // Calculate stats
  const activeTenders = tenders.filter(t => t.status === 'active').length;
  const expiringSoon = tenders.filter(t => {
    if (!t.end_date) return false;
    const endDate = new Date(t.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 && daysRemaining <= 30;
  }).length;

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tender-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Tender & Contract Management
          </h1>
          <p className="text-slate-600 mt-1">Manage tenders, contracts, and vehicle assignments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={fetchTenders} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreate && (
            <Button onClick={openNewTenderModal} className="bg-slate-900 hover:bg-slate-800" data-testid="add-tender-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Tender
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Tenders</p>
                <p className="text-2xl font-bold text-slate-900">{tenders.length}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-emerald-600">{activeTenders}</p>
              </div>
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-amber-600">{expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vehicles Assigned</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tenders.reduce((sum, t) => sum + (t.assigned_vehicles?.length || 0), 0)}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by tender name, number, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="tender-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tender Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenders.map((tender) => {
          const daysRemaining = getDaysRemaining(tender.end_date);
          const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
          const isExpired = daysRemaining !== null && daysRemaining <= 0;
          
          return (
            <Card 
              key={tender.id} 
              className={`border-slate-200 hover:shadow-lg transition-shadow cursor-pointer ${
                isExpired ? 'border-red-300 bg-red-50' : 
                isExpiringSoon ? 'border-amber-300 bg-amber-50' : ''
              }`}
              onClick={() => handleViewTender(tender)}
              data-testid={`tender-card-${tender.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tender.tender_name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{tender.tender_no}</p>
                  </div>
                  <StatusBadge status={tender.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="font-medium text-slate-900">{tender.client}</span>
                  </div>
                  {tender.plant && (
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-700">{tender.plant}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="text-slate-700">
                      {tender.start_date} to {tender.end_date}
                    </span>
                  </div>
                  
                  {daysRemaining !== null && (
                    <div className={`text-sm font-medium ${
                      isExpired ? 'text-red-600' : 
                      isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {isExpired ? 'Contract Expired' : 
                       isExpiringSoon ? `${daysRemaining} days remaining` : 
                       `${daysRemaining} days remaining`}
                    </div>
                  )}
                  
                  {tender.assigned_vehicles?.length > 0 && (
                    <div className="flex items-center text-sm">
                      <Truck className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-700">{tender.assigned_vehicles.length} vehicles assigned</span>
                    </div>
                  )}
                  
                  {(tender.sd_value || tender.bg_value) && (
                    <div className="pt-3 border-t border-slate-200">
                      {tender.sd_value && (
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-500">SD:</span>
                          <span className="font-medium text-slate-900">₹{tender.sd_value}</span>
                        </div>
                      )}
                      {tender.bg_value && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">BG:</span>
                          <span className="font-medium text-slate-900">₹{tender.bg_value}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewTender(tender);
                      }}
                      data-testid={`view-tender-${tender.id}`}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      View
                    </Button>
                    {canCreate && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(tender);
                        }}
                        data-testid={`edit-tender-${tender.id}`}
                      >
                        <Edit2 className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTenders.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No tenders found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Tender Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="tender-form-modal">
          <DialogHeader>
            <DialogTitle>{editingTender ? 'Edit Tender' : 'Add New Tender'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tender_name">Tender Name *</Label>
                    <Input
                      id="tender_name"
                      value={formData.tender_name}
                      onChange={(e) => setFormData({ ...formData, tender_name: e.target.value })}
                      required
                      data-testid="tender-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tender_no">Tender Number *</Label>
                    <Input
                      id="tender_no"
                      value={formData.tender_no}
                      onChange={(e) => setFormData({ ...formData, tender_no: e.target.value })}
                      required
                      data-testid="tender-no-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      required
                      placeholder="e.g., HPCL, BPCL, IOCL"
                      data-testid="client-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contract_type">Contract Type</Label>
                    <Input
                      id="contract_type"
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      placeholder="e.g., SLGC, SLTS"
                      data-testid="contract-type-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plant">Plant</Label>
                    <Input
                      id="plant"
                      value={formData.plant}
                      onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                      data-testid="plant-input"
                    />
                  </div>
                  <div></div>
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      data-testid="start-date-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      data-testid="end-date-input"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="financial" className="space-y-4 pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Security Deposit (SD)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sd_number">SD Number</Label>
                      <Input
                        id="sd_number"
                        value={formData.sd_number}
                        onChange={(e) => setFormData({ ...formData, sd_number: e.target.value })}
                        data-testid="sd-number-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sd_value">SD Amount</Label>
                      <Input
                        id="sd_value"
                        value={formData.sd_value}
                        onChange={(e) => setFormData({ ...formData, sd_value: e.target.value })}
                        placeholder="₹"
                        data-testid="sd-value-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sd_bank">SD Bank</Label>
                      <Input
                        id="sd_bank"
                        value={formData.sd_bank}
                        onChange={(e) => setFormData({ ...formData, sd_bank: e.target.value })}
                        data-testid="sd-bank-input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Bank Guarantee (BG)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bg_number">BG Number</Label>
                      <Input
                        id="bg_number"
                        value={formData.bg_number}
                        onChange={(e) => setFormData({ ...formData, bg_number: e.target.value })}
                        data-testid="bg-number-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bg_value">BG Amount</Label>
                      <Input
                        id="bg_value"
                        value={formData.bg_value}
                        onChange={(e) => setFormData({ ...formData, bg_value: e.target.value })}
                        placeholder="₹"
                        data-testid="bg-value-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bg_bank">BG Bank</Label>
                      <Input
                        id="bg_bank"
                        value={formData.bg_bank}
                        onChange={(e) => setFormData({ ...formData, bg_bank: e.target.value })}
                        data-testid="bg-bank-input"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="vehicles" className="space-y-4 pt-4">
                <div>
                  <Label>Assigned Vehicles</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.assigned_vehicles?.map((vehicleNo) => (
                      <span 
                        key={vehicleNo} 
                        className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-sm"
                      >
                        {vehicleNo}
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(vehicleNo)}
                          className="ml-2 text-slate-500 hover:text-slate-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {(!formData.assigned_vehicles || formData.assigned_vehicles.length === 0) && (
                      <span className="text-slate-500 text-sm">No vehicles assigned</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Available Vehicles</Label>
                  <div className="mt-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    {vehicles
                      .filter(v => !formData.assigned_vehicles?.includes(v.vehicle_no))
                      .map((vehicle) => (
                        <div 
                          key={vehicle.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{vehicle.vehicle_no}</p>
                            <p className="text-sm text-slate-500">{vehicle.make} - {vehicle.owner_name}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignVehicle(vehicle.vehicle_no)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-tender-btn">
                {editingTender ? 'Update Tender' : 'Create Tender'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tender Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="tender-detail-modal">
          {selectedTender && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedTender.tender_name}</DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">{selectedTender.tender_no}</p>
                  </div>
                  <StatusBadge status={selectedTender.status} />
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="vehicles">Vehicles ({selectedTender.assigned_vehicles?.length || 0})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-500">Client</Label>
                      <p className="font-medium text-slate-900">{selectedTender.client}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Contract Type</Label>
                      <p className="font-medium text-slate-900">{selectedTender.contract_type || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Plant</Label>
                      <p className="font-medium text-slate-900">{selectedTender.plant || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Status</Label>
                      <StatusBadge status={selectedTender.status} />
                    </div>
                    <div>
                      <Label className="text-slate-500">Start Date</Label>
                      <p className="font-medium text-slate-900">{selectedTender.start_date}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">End Date</Label>
                      <p className="font-medium text-slate-900">{selectedTender.end_date}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="financial" className="pt-4 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-900 mb-3">Security Deposit</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-slate-500">SD Number</Label>
                        <p className="font-medium text-slate-900">{selectedTender.sd_number || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Amount</Label>
                        <p className="font-medium text-slate-900">
                          {selectedTender.sd_value ? `₹${selectedTender.sd_value}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Bank</Label>
                        <p className="font-medium text-slate-900">{selectedTender.sd_bank || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-900 mb-3">Bank Guarantee</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-slate-500">BG Number</Label>
                        <p className="font-medium text-slate-900">{selectedTender.bg_number || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Amount</Label>
                        <p className="font-medium text-slate-900">
                          {selectedTender.bg_value ? `₹${selectedTender.bg_value}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Bank</Label>
                        <p className="font-medium text-slate-900">{selectedTender.bg_bank || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="vehicles" className="pt-4">
                  {selectedTender.assigned_vehicles?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTender.assigned_vehicles.map((vehicleNo) => {
                        const vehicleData = vehicles.find(v => v.vehicle_no === vehicleNo);
                        return (
                          <div 
                            key={vehicleNo}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <Truck className="h-5 w-5 text-slate-600" />
                              <div>
                                <p className="font-medium text-slate-900">{vehicleNo}</p>
                                <p className="text-sm text-slate-500">
                                  {vehicleData ? `${vehicleData.make} - ${vehicleData.owner_name}` : 'N/A'}
                                </p>
                              </div>
                            </div>
                            {vehicleData && <StatusBadge status={vehicleData.status} />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Truck className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>No vehicles assigned to this tender</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between pt-4 border-t border-slate-200 mt-4">
                <div>
                  {canDelete && (
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteTender(selectedTender.id)}
                      data-testid="delete-tender-btn"
                    >
                      Delete Tender
                    </Button>
                  )}
                </div>
                <div className="flex space-x-3">
                  {canCreate && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleEdit(selectedTender);
                      }}
                      data-testid="edit-tender-detail-btn"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenderManagement;
