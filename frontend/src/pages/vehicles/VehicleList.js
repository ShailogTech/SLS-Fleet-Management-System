import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import StatusBadge from '../../components/common/StatusBadge';
import VehicleDetailModal from '../../components/modals/VehicleDetailModal';
import { Plus, Search, Eye, Filter, Truck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const VehicleList = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchPlants();
  }, []);

  useEffect(() => {
    let filtered = vehicles;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const canCreate = ['maker', 'admin', 'superuser', 'office_incharge'].includes(user?.role);

  // Stats
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const pendingVehicles = vehicles.filter(v => v.status === 'pending').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vehicle-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Vehicles
          </h1>
          <p className="text-slate-600 mt-1">Manage your fleet vehicles</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={fetchVehicles} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreate && (
            <Link to="/vehicles/new">
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="add-vehicle-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
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
                placeholder="Search by vehicle number, owner, plant, or make..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="vehicle-search-input"
              />
            </div>
            <div className="flex gap-2">
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
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={plantFilter} onValueChange={setPlantFilter}>
                <SelectTrigger className="w-[160px]" data-testid="plant-filter">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Vehicle No
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Make
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Plant
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
              {filteredVehicles.map((vehicle) => (
                <tr 
                  key={vehicle.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer" 
                  onClick={() => handleViewVehicle(vehicle.id)}
                  data-testid={`vehicle-row-${vehicle.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {vehicle.vehicle_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {vehicle.owner_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {vehicle.make}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {vehicle.plant || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewVehicle(vehicle.id);
                      }}
                      data-testid={`view-vehicle-${vehicle.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
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
    </div>
  );
};

export default VehicleList;
