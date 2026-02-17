import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import StatusBadge from '../../components/common/StatusBadge';
import DriverDetailModal from '../../components/modals/DriverDetailModal';
import { Plus, Search, Eye, Filter, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DriverList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form state for adding new driver
  const [formData, setFormData] = useState({
    name: '',
    emp_id: '',
    phone: '',
    dl_no: '',
    dl_expiry: '',
    hazardous_cert_expiry: '',
    plant: '',
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    let filtered = drivers;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.emp_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm) ||
        d.dl_no?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }
    
    setFilteredDrivers(filtered);
  }, [searchTerm, statusFilter, drivers]);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
      setFilteredDrivers(response.data);
    } catch (error) {
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDriver = (driverId) => {
    setSelectedDriverId(driverId);
    setIsDetailModalOpen(true);
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedDriverId(null);
  };

  const handleDriverUpdate = () => {
    fetchDrivers();
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      await api.post('/drivers', formData);
      toast.success('Driver created successfully');
      setIsAddModalOpen(false);
      resetForm();
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create driver');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      emp_id: '',
      phone: '',
      dl_no: '',
      dl_expiry: '',
      hazardous_cert_expiry: '',
      plant: '',
    });
  };

  const canCreate = ['maker', 'admin', 'superuser', 'office_incharge'].includes(user?.role);

  // Stats
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const pendingDrivers = drivers.filter(d => d.status === 'pending').length;
  const onLeaveDrivers = drivers.filter(d => d.status === 'on_leave').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="driver-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Drivers
          </h1>
          <p className="text-slate-600 mt-1">Manage your fleet drivers</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={fetchDrivers} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreate && (
            <Button 
              className="bg-slate-900 hover:bg-slate-800" 
              onClick={() => navigate('/drivers/new')}
              data-testid="add-driver-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Drivers</p>
              <p className="text-2xl font-bold text-slate-900">{totalDrivers}</p>
            </div>
            <User className="h-8 w-8 text-slate-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{activeDrivers}</p>
            </div>
            <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{pendingDrivers}</p>
            </div>
            <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">On Leave</p>
              <p className="text-2xl font-bold text-blue-600">{onLeaveDrivers}</p>
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
                placeholder="Search by name, employee ID, phone, or DL number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="driver-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  DL Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Allocated Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredDrivers.map((driver) => (
                <tr 
                  key={driver.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer" 
                  onClick={() => handleViewDriver(driver.id)}
                  data-testid={`driver-row-${driver.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {driver.emp_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {driver.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {driver.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {driver.dl_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {driver.allocated_vehicle || 'Not Allocated'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={driver.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDriver(driver.id);
                      }}
                      data-testid={`view-driver-${driver.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDrivers.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No drivers found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Pagination info */}
        <div className="px-6 py-3 border-t border-slate-200 text-sm text-slate-500">
          Showing {filteredDrivers.length} of {drivers.length} drivers
        </div>
      </div>

      {/* Driver Detail Modal */}
      <DriverDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleDetailModalClose}
        driverId={selectedDriverId}
        onUpdate={handleDriverUpdate}
      />

      {/* Add Driver Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="add-driver-modal">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDriver} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="driver-name-input"
                />
              </div>
              <div>
                <Label htmlFor="emp_id">Employee ID *</Label>
                <Input
                  id="emp_id"
                  value={formData.emp_id}
                  onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                  required
                  data-testid="driver-emp-id-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="driver-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="dl_no">DL Number *</Label>
                <Input
                  id="dl_no"
                  value={formData.dl_no}
                  onChange={(e) => setFormData({ ...formData, dl_no: e.target.value })}
                  required
                  data-testid="driver-dl-input"
                />
              </div>
              <div>
                <Label htmlFor="dl_expiry">DL Expiry Date</Label>
                <Input
                  id="dl_expiry"
                  type="date"
                  value={formData.dl_expiry}
                  onChange={(e) => setFormData({ ...formData, dl_expiry: e.target.value })}
                  data-testid="driver-dl-expiry-input"
                />
              </div>
              <div>
                <Label htmlFor="hazardous_cert_expiry">Hazardous Cert Expiry</Label>
                <Input
                  id="hazardous_cert_expiry"
                  type="date"
                  value={formData.hazardous_cert_expiry}
                  onChange={(e) => setFormData({ ...formData, hazardous_cert_expiry: e.target.value })}
                  data-testid="driver-hazardous-expiry-input"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="plant">Plant</Label>
                <Input
                  id="plant"
                  value={formData.plant}
                  onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                  placeholder="e.g., MRPL HPCL"
                  data-testid="driver-plant-input"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-driver-btn">
                Create Driver
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverList;
