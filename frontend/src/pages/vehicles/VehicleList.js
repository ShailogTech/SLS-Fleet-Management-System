import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import StatusBadge from '../../components/common/StatusBadge';
import VehicleDetailModal from '../../components/modals/VehicleDetailModal';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Search, Eye, Filter, Truck, RefreshCw, ArrowRightLeft, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';

const VehicleList = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [plants, setPlants] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Shift modal state
  const [shiftVehicle, setShiftVehicle] = useState(null);
  const [shiftForm, setShiftForm] = useState({ noc_applied: false, noc_obtained: false, loe_obtained: false, new_vehicle_no: '', tender: '', plant: '' });
  const [showRenumberInput, setShowRenumberInput] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Inline create states
  const [shiftView, setShiftView] = useState('main'); // 'main' | 'createTender' | 'createPlant'
  const [newTenderForm, setNewTenderForm] = useState({
    tender_name: '', tender_no: '', client: '', start_date: '', end_date: '',
    contract_type: '', plant: '', sd_number: '', sd_value: '', sd_bank: '',
    bg_number: '', bg_value: '', bg_bank: '', assigned_vehicles: [],
  });
  const [newPlantForm, setNewPlantForm] = useState({ plant_name: '', plant_type: '', city: '', state: '', contact_phone: '', contact_email: '', plant_incharge_id: '' });
  const [inchargeUsers, setInchargeUsers] = useState([]);
  const [inlineCreateLoading, setInlineCreateLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchPlants();
    fetchTenders();
    fetchInchargeUsers();
  }, []);

  useEffect(() => { registerRefresh(fetchVehicles); }, []);

  useEffect(() => {
    let filtered = vehicles;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.engine_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.assigned_driver_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Plant filter
    if (plantFilter !== 'all') {
      filtered = filtered.filter(v => v.plant === plantFilter);
    }

    setFilteredVehicles(filtered);
  }, [searchTerm, statusFilter, plantFilter, vehicles]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data);
      setFilteredVehicles(response.data);
    } catch (error) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
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

  const fetchTenders = async () => {
    try {
      const response = await api.get('/tenders');
      setTenders(response.data);
    } catch (error) {
      console.error('Failed to load tenders');
    }
  };

  const fetchInchargeUsers = async () => {
    try {
      const res = await api.get('/users');
      setInchargeUsers(res.data.filter(u => u.role === 'plant_incharge' && u.status === 'active'));
    } catch { /* ignore */ }
  };

  const handleViewVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedVehicleId(null);
  };

  const handleVehicleUpdate = () => {
    fetchVehicles();
  };

  const canCreate = ['maker', 'admin', 'superadmin', 'office_incharge'].includes(user?.role);
  const canShift = ['maker', 'admin', 'superadmin', 'office_incharge'].includes(user?.role);

  const handleOpenShift = (vehicle) => {
    setShiftVehicle(vehicle);
    setShiftForm({ noc_applied: false, noc_obtained: false, loe_obtained: false, new_vehicle_no: '', tender: '', plant: '' });
    setShowRenumberInput(false);
    setShiftView('main');
  };

  const handleCloseShift = () => {
    setShiftVehicle(null);
    setShowRenumberInput(false);
    setShiftView('main');
  };

  const allChecked = shiftForm.noc_applied && shiftForm.noc_obtained && shiftForm.loe_obtained;

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
      toast.success('Vehicle renumbered successfully');
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
      const payload = { ...newPlantForm };
      if (!payload.contact_phone) delete payload.contact_phone;
      if (!payload.contact_email) delete payload.contact_email;
      if (!payload.plant_incharge_id) delete payload.plant_incharge_id;
      await api.post('/plants', payload);
      toast.success('Plant created');
      await fetchPlants();
      setShiftForm(prev => ({ ...prev, plant: plant_name }));
      setNewPlantForm({ plant_name: '', plant_type: '', city: '', state: '', contact_phone: '', contact_email: '', plant_incharge_id: '' });
      setShiftView('main');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create plant');
    } finally {
      setInlineCreateLoading(false);
    }
  };

  // Stats
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const pendingVehicles = vehicles.filter(v => v.status === 'pending').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="vehicle-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Vehicles
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage your fleet vehicles</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Button variant="outline" size="sm" onClick={fetchVehicles} data-testid="refresh-btn" className="sm:size-default">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canCreate && (
            <Link to="/vehicles/new">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 sm:size-default" data-testid="add-vehicle-btn">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Vehicle</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Vehicles</p>
              <p className="text-2xl font-bold text-slate-900">{totalVehicles}</p>
            </div>
            <Truck className="h-8 w-8 text-slate-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{activeVehicles}</p>
            </div>
            <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{pendingVehicles}</p>
            </div>
            <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Maintenance</p>
              <p className="text-2xl font-bold text-blue-600">{maintenanceVehicles}</p>
            </div>
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by vehicle no, engine no, owner, plant, or make..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="vehicle-search-input"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]" data-testid="status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={plantFilter} onValueChange={setPlantFilter}>
                <SelectTrigger className="w-full sm:w-[160px]" data-testid="plant-filter">
                  <SelectValue placeholder="Plant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.plant_name}>
                      {plant.plant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.engine_no || vehicle.id}
              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => handleViewVehicle(vehicle.engine_no)}
              data-testid={`vehicle-row-${vehicle.engine_no}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{vehicle.vehicle_no}</p>
                  <p className="text-xs text-slate-500 font-mono">{vehicle.engine_no || '-'}</p>
                </div>
                <StatusBadge status={vehicle.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 mb-3">
                <div><span className="text-slate-400">Owner:</span> {vehicle.owner_name}</div>
                <div><span className="text-slate-400">Make:</span> {vehicle.make}</div>
                <div><span className="text-slate-400">Driver:</span> {vehicle.assigned_driver_name || '—'}</div>
                <div><span className="text-slate-400">Plant:</span> {vehicle.plant || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleViewVehicle(vehicle.engine_no); }}
                >
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                {canShift && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => { e.stopPropagation(); handleOpenShift(vehicle); }}
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1" /> Shift
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filteredVehicles.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Truck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No vehicles found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Make</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => (
                <tr
                  key={vehicle.engine_no || vehicle.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleViewVehicle(vehicle.engine_no)}
                  data-testid={`vehicle-row-desktop-${vehicle.engine_no}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{vehicle.vehicle_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{vehicle.engine_no || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{vehicle.owner_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{vehicle.make}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{vehicle.assigned_driver_name || <span className="text-slate-400">—</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{vehicle.plant || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={vehicle.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewVehicle(vehicle.engine_no); }} data-testid={`view-vehicle-${vehicle.engine_no}`}>
                        <Eye className="h-4 w-4 mr-2" /> View
                      </Button>
                      {canShift && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenShift(vehicle); }} data-testid={`shift-vehicle-${vehicle.engine_no}`}>
                          <ArrowRightLeft className="h-4 w-4 mr-2" /> Shift
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVehicles.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Truck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No vehicles found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Pagination info */}
        <div className="px-6 py-3 border-t border-slate-200 text-sm text-slate-500">
          Showing {filteredVehicles.length} of {vehicles.length} vehicles
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        vehicleId={selectedVehicleId}
        onUpdate={handleVehicleUpdate}
      />

      {/* Shift Modal */}
      {shiftVehicle && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={handleCloseShift} />
          <div className={`relative bg-white rounded-lg shadow-xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto ${shiftView !== 'main' ? 'max-w-4xl' : 'max-w-md'}`}>

            {/* === Main Shift View === */}
            {shiftView === 'main' && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Shift Vehicle</h2>
                <p className="text-sm text-slate-500 mb-4 font-mono">{shiftVehicle.vehicle_no}</p>

                <div className="space-y-3 mb-5">
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
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800"
                    disabled={!allChecked}
                    onClick={() => setShowRenumberInput(true)}
                  >
                    Renumber
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>Vehicle Number</Label>
                      <Input
                        value={shiftForm.new_vehicle_no}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, new_vehicle_no: e.target.value }))}
                        placeholder="Enter vehicle number"
                        className="mt-1"
                        data-testid="shift-new-vehicle-no"
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

                {!showRenumberInput && (
                  <Button variant="ghost" className="w-full mt-2" onClick={handleCloseShift}>
                    Cancel
                  </Button>
                )}
              </>
            )}

            {/* === Create Tender View (full tabbed form) === */}
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
                        <Input
                          value={newTenderForm.tender_name}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, tender_name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Tender Number *</Label>
                        <Input
                          value={newTenderForm.tender_no}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, tender_no: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Client *</Label>
                        <Input
                          value={newTenderForm.client}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, client: e.target.value }))}
                          placeholder="e.g., HPCL, BPCL, IOCL"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Contract Type</Label>
                        <Input
                          value={newTenderForm.contract_type}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, contract_type: e.target.value }))}
                          placeholder="e.g., SLGC, SLTS"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Plant</Label>
                        <Input
                          value={newTenderForm.plant}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, plant: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div></div>
                      <div>
                        <Label>Start Date *</Label>
                        <Input
                          type="date"
                          value={newTenderForm.start_date}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, start_date: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>End Date *</Label>
                        <Input
                          type="date"
                          value={newTenderForm.end_date}
                          onChange={(e) => setNewTenderForm(prev => ({ ...prev, end_date: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="financial" className="space-y-4 pt-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Security Deposit (SD)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label>SD Number</Label>
                          <Input
                            value={newTenderForm.sd_number}
                            onChange={(e) => setNewTenderForm(prev => ({ ...prev, sd_number: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>SD Amount</Label>
                          <Input
                            value={newTenderForm.sd_value}
                            onChange={(e) => setNewTenderForm(prev => ({ ...prev, sd_value: e.target.value }))}
                            placeholder="₹"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>SD Bank</Label>
                          <Input
                            value={newTenderForm.sd_bank}
                            onChange={(e) => setNewTenderForm(prev => ({ ...prev, sd_bank: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Bank Guarantee (BG)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label>BG Number</Label>
                          <Input
                            value={newTenderForm.bg_number}
                            onChange={(e) => setNewTenderForm(prev => ({ ...prev, bg_number: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>BG Amount</Label>
                          <Input
                            value={newTenderForm.bg_value}
                            onChange={(e) => setNewTenderForm(prev => ({ ...prev, bg_value: e.target.value }))}
                            placeholder="₹"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>BG Bank</Label>
                          <Input
                            value={newTenderForm.bg_bank}
                            onChange={(e) => setNewTenderForm(prev => ({ ...prev, bg_bank: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
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
                            <button
                              type="button"
                              onClick={() => setNewTenderForm(prev => ({ ...prev, assigned_vehicles: prev.assigned_vehicles.filter(v => v !== vNo) }))}
                              className="ml-2 text-slate-500 hover:text-slate-700"
                            >
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
                        {vehicles
                          .filter(v => !newTenderForm.assigned_vehicles?.includes(v.vehicle_no))
                          .map((v) => (
                            <div key={v.id} className="flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{v.vehicle_no}</p>
                                <p className="text-xs text-slate-500">{v.make} - {v.owner_name}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setNewTenderForm(prev => ({ ...prev, assigned_vehicles: [...(prev.assigned_vehicles || []), v.vehicle_no] }))}
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

                <div className="flex gap-2 pt-4 border-t border-slate-200 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShiftView('main')}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-slate-900 hover:bg-slate-800"
                    disabled={inlineCreateLoading}
                    onClick={handleCreateTenderInline}
                  >
                    {inlineCreateLoading ? 'Creating...' : 'Create Tender'}
                  </Button>
                </div>
              </>
            )}

            {/* === Create Plant View (full form) === */}
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
                      <Input
                        value={newPlantForm.plant_name}
                        onChange={(e) => setNewPlantForm(prev => ({ ...prev, plant_name: e.target.value }))}
                        placeholder="Enter plant name"
                        className="mt-1"
                      />
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
                      <Input
                        value={newPlantForm.city}
                        onChange={(e) => setNewPlantForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>State *</Label>
                      <Input
                        value={newPlantForm.state}
                        onChange={(e) => setNewPlantForm(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="Enter state"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Contact Phone</Label>
                      <Input
                        value={newPlantForm.contact_phone}
                        onChange={(e) => setNewPlantForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                        placeholder="Enter phone number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input
                        type="email"
                        value={newPlantForm.contact_email}
                        onChange={(e) => setNewPlantForm(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="Enter email address"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Plant Incharge</Label>
                      <select
                        value={newPlantForm.plant_incharge_id}
                        onChange={(e) => setNewPlantForm(prev => ({ ...prev, plant_incharge_id: e.target.value }))}
                        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select plant incharge</option>
                        {inchargeUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <Button variant="outline" className="flex-1" onClick={() => setShiftView('main')}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-slate-900 hover:bg-slate-800"
                      disabled={inlineCreateLoading}
                      onClick={handleCreatePlantInline}
                    >
                      {inlineCreateLoading ? 'Creating...' : 'Create Plant'}
                    </Button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VehicleList;
