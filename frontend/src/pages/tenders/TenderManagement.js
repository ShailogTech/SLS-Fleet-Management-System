import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Edit2, Calendar, FileText, Building, Truck, Eye, Search, RefreshCw, X, Check, AlertTriangle, ArrowLeft, ArrowRight, ArrowRightLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import TruckLoader from '../../components/common/TruckLoader';

const TenderManagement = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [tenders, setTenders] = useState([]);
  const [filteredTenders, setFilteredTenders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [plants, setPlants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreatePlant, setShowCreatePlant] = useState(false);
  const [createPlantForm, setCreatePlantForm] = useState({
    plant_name: '', plant_type: '', city: '', state: '',
    contact_phone: '', contact_email: '', plant_incharge_id: '',
  });
  const [createPlantLoading, setCreatePlantLoading] = useState(false);
  const [inchargeUsers, setInchargeUsers] = useState([]);

  // Shift modal state
  const [shiftVehicle, setShiftVehicle] = useState(null);
  const [shiftForm, setShiftForm] = useState({ noc_applied: false, noc_obtained: false, loe_obtained: false, new_vehicle_no: '', tender: '', plant: '' });
  const [showRenumberInput, setShowRenumberInput] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftView, setShiftView] = useState('main');
  const [newTenderForm, setNewTenderForm] = useState({
    tender_name: '', tender_no: '', client: '', start_date: '', end_date: '',
    contract_type: '', plant: '', sd_number: '', sd_value: '', sd_bank: '',
    bg_number: '', bg_value: '', bg_bank: '', assigned_vehicles: [],
  });
  const [newPlantForm, setNewPlantForm] = useState({ plant_name: '', plant_type: '', city: '', state: '' });
  const [inlineCreateLoading, setInlineCreateLoading] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTender, setEditingTender] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
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
    fetchPlants();
    fetchInchargeUsers();
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

  const getEffectiveStatus = (tender) => {
    const effectiveEnd = tender.extension_end_date || tender.contract_validity || tender.end_date;
    if (effectiveEnd) {
      const end = new Date(effectiveEnd);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (end < today) return 'expired';
    }
    return tender.status;
  };

  const fetchTenders = async () => {
    try {
      const response = await api.get('/tenders');
      const enriched = response.data.map(t => ({
        ...t,
        status: getEffectiveStatus(t),
      }));
      setTenders(enriched);
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

  const fetchPlants = async () => {
    try {
      const response = await api.get('/plants');
      setPlants(response.data);
    } catch (error) {
      console.error('Failed to load plants');
    }
  };

  const fetchInchargeUsers = async () => {
    try {
      const res = await api.get('/users');
      setInchargeUsers(res.data.filter(u => u.role === 'plant_incharge' && u.status === 'active'));
    } catch { /* ignore */ }
  };

  const handleCreatePlant = async () => {
    const { plant_name, plant_type, city, state } = createPlantForm;
    if (!plant_name || !plant_type || !city || !state) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreatePlantLoading(true);
    try {
      const payload = { ...createPlantForm };
      if (!payload.contact_phone) delete payload.contact_phone;
      if (!payload.contact_email) delete payload.contact_email;
      if (!payload.plant_incharge_id) delete payload.plant_incharge_id;
      await api.post('/plants', payload);
      toast.success('Plant created successfully');
      setFormData(prev => ({ ...prev, plant: plant_name }));
      setShowCreatePlant(false);
      setCreatePlantForm({ plant_name: '', plant_type: '', city: '', state: '', contact_phone: '', contact_email: '', plant_incharge_id: '' });
      fetchPlants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create plant');
    } finally {
      setCreatePlantLoading(false);
    }
  };

  // Shift modal handlers
  const allShiftChecked = shiftForm.noc_applied && shiftForm.noc_obtained && shiftForm.loe_obtained;

  const handleOpenShift = (vehicle) => {
    setShiftVehicle(vehicle);
    setShiftForm({
      noc_applied: false, noc_obtained: false, loe_obtained: false,
      new_vehicle_no: '',
      tender: formData.tender_name || '',
      plant: formData.plant || '',
    });
    setShowRenumberInput(false);
    setShiftView('main');
  };

  const handleCloseShift = () => {
    setShiftVehicle(null);
    setShowRenumberInput(false);
    setShiftView('main');
  };

  const handleShiftSubmit = async () => {
    if (!shiftForm.new_vehicle_no.trim()) {
      toast.error('Please enter a new vehicle number');
      return;
    }
    setShiftLoading(true);
    try {
      await api.post(`/vehicles/${shiftVehicle.engine_no}/shift`, {
        noc_applied: shiftForm.noc_applied,
        noc_obtained: shiftForm.noc_obtained,
        loe_obtained: shiftForm.loe_obtained,
        new_vehicle_no: shiftForm.new_vehicle_no.trim(),
        tender: shiftForm.tender || null,
        plant: shiftForm.plant || null,
      });
      toast.success('Vehicle shifted successfully');
      // Add the new vehicle number to the tender's assigned vehicles
      const newVehicleNo = shiftForm.new_vehicle_no.trim();
      const current = formData.assigned_vehicles || [];
      if (!current.includes(newVehicleNo)) {
        setFormData(prev => ({ ...prev, assigned_vehicles: [...(prev.assigned_vehicles || []), newVehicleNo] }));
      }
      handleCloseShift();
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to shift vehicle');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleCreateTenderInline = async () => {
    const { tender_name, tender_no, client, start_date, end_date } = newTenderForm;
    if (!tender_name || !tender_no || !client || !start_date || !end_date) {
      toast.error('Please fill all required fields');
      return;
    }
    setInlineCreateLoading(true);
    try {
      await api.post('/tenders', newTenderForm);
      toast.success('Tender created');
      await fetchTenders();
      setShiftForm(prev => ({ ...prev, tender: tender_name }));
      setNewTenderForm({
        tender_name: '', tender_no: '', client: '', start_date: '', end_date: '',
        contract_type: '', plant: '', sd_number: '', sd_value: '', sd_bank: '',
        bg_number: '', bg_value: '', bg_bank: '', assigned_vehicles: [],
      });
      setShiftView('main');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create tender');
    } finally {
      setInlineCreateLoading(false);
    }
  };

  const handleCreatePlantInline = async () => {
    const { plant_name, plant_type, city, state } = newPlantForm;
    if (!plant_name || !plant_type || !city || !state) {
      toast.error('Please fill all required fields');
      return;
    }
    setInlineCreateLoading(true);
    try {
      await api.post('/plants', newPlantForm);
      toast.success('Plant created');
      await fetchPlants();
      setShiftForm(prev => ({ ...prev, plant: plant_name }));
      setNewPlantForm({ plant_name: '', plant_type: '', city: '', state: '' });
      setShiftView('main');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create plant');
    } finally {
      setInlineCreateLoading(false);
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
      fetchVehicles();
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
      fetchVehicles();
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
    setShowCreatePlant(false);
    setCreatePlantForm({ plant_name: '', plant_type: '', city: '', state: '', contact_phone: '', contact_email: '', plant_incharge_id: '' });
  };

  const openNewTenderModal = () => {
    resetForm();
    setActiveTab('basic');
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
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="tender-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Tender & Contract Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">Manage tenders, contracts, and vehicle assignments</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Button variant="outline" size="sm" onClick={fetchTenders} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openNewTenderModal} className="bg-slate-900 hover:bg-slate-800" data-testid="add-tender-btn">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Tender</span>
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
          <SelectTrigger className="w-full sm:w-[140px]" data-testid="status-filter">
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Select value={formData.client} onValueChange={(val) => setFormData({ ...formData, client: val })} data-testid="client-input">
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HPCL">HPCL</SelectItem>
                        <SelectItem value="BPCL">BPCL</SelectItem>
                        <SelectItem value="IOCL">IOCL</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={formData.plant || ''}
                          onValueChange={(value) => {
                            setFormData({ ...formData, plant: value });
                            setShowCreatePlant(false);
                          }}
                        >
                          <SelectTrigger data-testid="plant-input">
                            <SelectValue placeholder="Select a plant" />
                          </SelectTrigger>
                          <SelectContent>
                            {plants.map((p) => (
                              <SelectItem key={p.id} value={p.plant_name}>{p.plant_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        title="Create Plant"
                        onClick={() => {
                          setShowCreatePlant(true);
                          setCreatePlantForm(prev => ({ ...prev, plant_type: formData.client || '' }));
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
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
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button type="button" onClick={() => setActiveTab('financial')} className="bg-slate-900 hover:bg-slate-800">
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Security Deposit (SD)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('basic')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="button" onClick={() => setActiveTab('vehicles')} className="bg-slate-900 hover:bg-slate-800">
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="vehicles" className="space-y-4 pt-4">
                {/* Assigned Vehicles */}
                <div>
                  <Label>Assigned Vehicles ({formData.assigned_vehicles?.length || 0})</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.assigned_vehicles?.map((vehicleNo) => {
                      const veh = vehicles.find(v => v.vehicle_no === vehicleNo);
                      return (
                        <span
                          key={vehicleNo}
                          className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-sm"
                        >
                          {vehicleNo}{veh ? ` (${veh.make})` : ''}
                          <button
                            type="button"
                            onClick={() => handleRemoveVehicle(vehicleNo)}
                            className="ml-2 text-slate-500 hover:text-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                    {(!formData.assigned_vehicles || formData.assigned_vehicles.length === 0) && (
                      <span className="text-slate-500 text-sm">No vehicles assigned</span>
                    )}
                  </div>
                </div>

                {/* Available Vehicles (no tender assigned) */}
                <div>
                  <Label>Available Vehicles (Unassigned)</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    {(() => {
                      const available = vehicles.filter(v =>
                        !formData.assigned_vehicles?.includes(v.vehicle_no) && !v.tender_name
                      );
                      if (available.length === 0) return (
                        <p className="p-3 text-sm text-slate-400 italic">No unassigned vehicles available</p>
                      );
                      return available.map((vehicle) => (
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
                      ));
                    })()}
                  </div>
                </div>

                {/* Vehicles with existing tenders (shift option) */}
                <div>
                  <Label>Vehicles with Existing Tender (Shift to this tender)</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-amber-200 rounded-lg bg-amber-50/30">
                    {(() => {
                      const withTender = vehicles.filter(v =>
                        !formData.assigned_vehicles?.includes(v.vehicle_no) && v.tender_name
                      );
                      if (withTender.length === 0) return (
                        <p className="p-3 text-sm text-slate-400 italic">No vehicles with existing tenders</p>
                      );
                      return withTender.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="flex items-center justify-between p-3 hover:bg-amber-50 border-b border-amber-100 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{vehicle.vehicle_no}</p>
                            <p className="text-sm text-slate-500">{vehicle.make} - {vehicle.owner_name}</p>
                            <p className="text-xs text-amber-600 font-medium">Current: {vehicle.tender_name}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => handleOpenShift(vehicle)}
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Shift
                          </Button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div className="flex justify-start pt-4 border-t border-slate-200">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('financial')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              {activeTab === 'vehicles' && (
                <Button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800"
                  disabled={!editingTender && (!formData.assigned_vehicles || formData.assigned_vehicles.length === 0)}
                  data-testid="save-tender-btn"
                >
                  {editingTender ? 'Update Tender' : 'Create Tender'}
                </Button>
              )}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Create Plant Modal */}
      <Dialog open={showCreatePlant} onOpenChange={setShowCreatePlant}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg">
              <Building className="h-5 w-5 mr-2 text-blue-600" />
              Add New Plant
            </DialogTitle>
            <p className="text-sm text-slate-500">Register a new plant location</p>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Plant Name *</Label>
              <Input
                value={createPlantForm.plant_name}
                onChange={(e) => setCreatePlantForm(prev => ({ ...prev, plant_name: e.target.value }))}
                placeholder="Enter plant name"
              />
            </div>
            <div className="space-y-2">
              <Label>Plant Type *</Label>
              <Select
                value={createPlantForm.plant_type}
                onValueChange={(val) => setCreatePlantForm(prev => ({ ...prev, plant_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HPCL">HPCL</SelectItem>
                  <SelectItem value="IOCL">IOCL</SelectItem>
                  <SelectItem value="BPCL">BPCL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                value={createPlantForm.city}
                onChange={(e) => setCreatePlantForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input
                value={createPlantForm.state}
                onChange={(e) => setCreatePlantForm(prev => ({ ...prev, state: e.target.value }))}
                placeholder="Enter state"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={createPlantForm.contact_phone}
                onChange={(e) => setCreatePlantForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={createPlantForm.contact_email}
                onChange={(e) => setCreatePlantForm(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label>Plant Incharge</Label>
              <Select
                value={createPlantForm.plant_incharge_id}
                onValueChange={(val) => setCreatePlantForm(prev => ({ ...prev, plant_incharge_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant incharge" />
                </SelectTrigger>
                <SelectContent>
                  {inchargeUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreatePlant(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800"
              disabled={createPlantLoading}
              onClick={handleCreatePlant}
            >
              {createPlantLoading ? 'Creating...' : 'Create Plant'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift Vehicle Modal */}
      <Dialog open={!!shiftVehicle} onOpenChange={(open) => { if (!open) handleCloseShift(); }}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${shiftView !== 'main' ? 'max-w-4xl' : 'max-w-md'}`}>
          {shiftVehicle && (
            <>
              {/* === Main Shift View === */}
              {shiftView === 'main' && (
                <>
                  <DialogHeader>
                    <DialogTitle>Shift Vehicle</DialogTitle>
                    <p className="text-sm text-slate-500 font-mono">{shiftVehicle.vehicle_no}</p>
                    <p className="text-xs text-amber-600 font-medium">Current tender: {shiftVehicle.tender_name}</p>
                  </DialogHeader>

                  <div className="space-y-3 my-4">
                    {[
                      { key: 'noc_applied', label: 'NOC Applied' },
                      { key: 'noc_obtained', label: 'NOC Obtained' },
                      { key: 'loe_obtained', label: 'LOE Obtained' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shiftForm[key]}
                          onChange={(e) => setShiftForm(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>

                  {!showRenumberInput ? (
                    <>
                      <Button
                        className="w-full bg-slate-900 hover:bg-slate-800"
                        disabled={!allShiftChecked}
                        onClick={() => setShowRenumberInput(true)}
                      >
                        Renumber
                      </Button>
                      <Button variant="ghost" className="w-full mt-2" onClick={handleCloseShift}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label>New Vehicle Number</Label>
                        <Input
                          value={shiftForm.new_vehicle_no}
                          onChange={(e) => setShiftForm(prev => ({ ...prev, new_vehicle_no: e.target.value }))}
                          placeholder="Enter new vehicle number"
                          className="mt-1"
                        />
                      </div>

                      {/* Tender */}
                      <div>
                        <Label>Tender</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1">
                            <Select
                              value={shiftForm.tender}
                              onValueChange={(val) => setShiftForm(prev => ({ ...prev, tender: val }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Tender" />
                              </SelectTrigger>
                              <SelectContent>
                                {tenders.map((t) => (
                                  <SelectItem key={t.id} value={t.tender_name}>
                                    {t.tender_name} ({t.tender_no})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            title="Create Tender"
                            onClick={() => setShiftView('createTender')}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Plant */}
                      <div>
                        <Label>Plant</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1">
                            <Select
                              value={shiftForm.plant}
                              onValueChange={(val) => setShiftForm(prev => ({ ...prev, plant: val }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Plant" />
                              </SelectTrigger>
                              <SelectContent>
                                {plants.map((p) => (
                                  <SelectItem key={p.id} value={p.plant_name}>
                                    {p.plant_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            title="Create Plant"
                            onClick={() => setShiftView('createPlant')}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={handleCloseShift}>
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-slate-900 hover:bg-slate-800"
                          disabled={!shiftForm.new_vehicle_no.trim() || shiftLoading}
                          onClick={handleShiftSubmit}
                        >
                          {shiftLoading ? 'Submitting...' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* === Create Tender View === */}
              {shiftView === 'createTender' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShiftView('main')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold text-slate-900">Add New Tender</h2>
                  </div>

                  <Tabs defaultValue="basic">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="financial">Financial</TabsTrigger>
                      <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-3 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Tender Name *</Label>
                          <Input value={newTenderForm.tender_name} onChange={(e) => setNewTenderForm(prev => ({ ...prev, tender_name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>Tender Number *</Label>
                          <Input value={newTenderForm.tender_no} onChange={(e) => setNewTenderForm(prev => ({ ...prev, tender_no: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>Client *</Label>
                          <Select value={newTenderForm.client} onValueChange={(val) => setNewTenderForm(prev => ({ ...prev, client: val }))}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HPCL">HPCL</SelectItem>
                              <SelectItem value="BPCL">BPCL</SelectItem>
                              <SelectItem value="IOCL">IOCL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Contract Type</Label>
                          <Input value={newTenderForm.contract_type} onChange={(e) => setNewTenderForm(prev => ({ ...prev, contract_type: e.target.value }))} placeholder="e.g., SLGC, SLTS" className="mt-1" />
                        </div>
                        <div>
                          <Label>Plant</Label>
                          <Input value={newTenderForm.plant} onChange={(e) => setNewTenderForm(prev => ({ ...prev, plant: e.target.value }))} className="mt-1" />
                        </div>
                        <div></div>
                        <div>
                          <Label>Start Date *</Label>
                          <Input type="date" value={newTenderForm.start_date} onChange={(e) => setNewTenderForm(prev => ({ ...prev, start_date: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label>End Date *</Label>
                          <Input type="date" value={newTenderForm.end_date} onChange={(e) => setNewTenderForm(prev => ({ ...prev, end_date: e.target.value }))} className="mt-1" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-4 pt-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Security Deposit (SD)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div><Label>SD Number</Label><Input value={newTenderForm.sd_number} onChange={(e) => setNewTenderForm(prev => ({ ...prev, sd_number: e.target.value }))} className="mt-1" /></div>
                          <div><Label>SD Amount</Label><Input value={newTenderForm.sd_value} onChange={(e) => setNewTenderForm(prev => ({ ...prev, sd_value: e.target.value }))} placeholder="₹" className="mt-1" /></div>
                          <div><Label>SD Bank</Label><Input value={newTenderForm.sd_bank} onChange={(e) => setNewTenderForm(prev => ({ ...prev, sd_bank: e.target.value }))} className="mt-1" /></div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Bank Guarantee (BG)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div><Label>BG Number</Label><Input value={newTenderForm.bg_number} onChange={(e) => setNewTenderForm(prev => ({ ...prev, bg_number: e.target.value }))} className="mt-1" /></div>
                          <div><Label>BG Amount</Label><Input value={newTenderForm.bg_value} onChange={(e) => setNewTenderForm(prev => ({ ...prev, bg_value: e.target.value }))} placeholder="₹" className="mt-1" /></div>
                          <div><Label>BG Bank</Label><Input value={newTenderForm.bg_bank} onChange={(e) => setNewTenderForm(prev => ({ ...prev, bg_bank: e.target.value }))} className="mt-1" /></div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="vehicles" className="space-y-3 pt-4">
                      <div>
                        <Label>Assigned Vehicles</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {newTenderForm.assigned_vehicles?.map((vNo) => (
                            <span key={vNo} className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-sm">
                              {vNo}
                              <button type="button" onClick={() => setNewTenderForm(prev => ({ ...prev, assigned_vehicles: prev.assigned_vehicles.filter(v => v !== vNo) }))} className="ml-2 text-slate-500 hover:text-slate-700">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          {(!newTenderForm.assigned_vehicles || newTenderForm.assigned_vehicles.length === 0) && (
                            <span className="text-slate-500 text-sm">No vehicles assigned</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Available Vehicles</Label>
                        <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                          {vehicles.filter(v => !newTenderForm.assigned_vehicles?.includes(v.vehicle_no)).map((v) => (
                            <div key={v.id} className="flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{v.vehicle_no}</p>
                                <p className="text-xs text-slate-500">{v.make} - {v.owner_name}</p>
                              </div>
                              <Button type="button" size="sm" variant="outline" onClick={() => setNewTenderForm(prev => ({ ...prev, assigned_vehicles: [...(prev.assigned_vehicles || []), v.vehicle_no] }))}>
                                <Plus className="h-3 w-3 mr-1" /> Assign
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 pt-4 border-t border-slate-200 mt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setShiftView('main')}>Cancel</Button>
                    <Button className="flex-1 bg-slate-900 hover:bg-slate-800" disabled={inlineCreateLoading} onClick={handleCreateTenderInline}>
                      {inlineCreateLoading ? 'Creating...' : 'Create Tender'}
                    </Button>
                  </div>
                </>
              )}

              {/* === Create Plant View === */}
              {shiftView === 'createPlant' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShiftView('main')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Add New Plant</h2>
                      <p className="text-sm text-slate-500">Register a new plant location</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Plant Name *</Label>
                        <Input value={newPlantForm.plant_name} onChange={(e) => setNewPlantForm(prev => ({ ...prev, plant_name: e.target.value }))} placeholder="Enter plant name" className="mt-1" />
                      </div>
                      <div>
                        <Label>Plant Type *</Label>
                        <select
                          value={newPlantForm.plant_type}
                          onChange={(e) => setNewPlantForm(prev => ({ ...prev, plant_type: e.target.value }))}
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Select type</option>
                          <option value="HPCL">HPCL</option>
                          <option value="IOCL">IOCL</option>
                          <option value="BPCL">BPCL</option>
                        </select>
                      </div>
                      <div>
                        <Label>City *</Label>
                        <Input value={newPlantForm.city} onChange={(e) => setNewPlantForm(prev => ({ ...prev, city: e.target.value }))} placeholder="Enter city" className="mt-1" />
                      </div>
                      <div>
                        <Label>State *</Label>
                        <Input value={newPlantForm.state} onChange={(e) => setNewPlantForm(prev => ({ ...prev, state: e.target.value }))} placeholder="Enter state" className="mt-1" />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-200">
                      <Button variant="outline" className="flex-1" onClick={() => setShiftView('main')}>Cancel</Button>
                      <Button className="flex-1 bg-slate-900 hover:bg-slate-800" disabled={inlineCreateLoading} onClick={handleCreatePlantInline}>
                        {inlineCreateLoading ? 'Creating...' : 'Create Plant'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenderManagement;
