import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, MapPin, Building, Phone, ArrowLeft, Truck, Eye, User, Users, Edit2, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';
import VehicleDetailModal from '../../components/modals/VehicleDetailModal';
import DriverDetailModal from '../../components/modals/DriverDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';

const TYPE_COLORS = {
  HPCL: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600', badge: 'bg-blue-100' },
  IOCL: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600', badge: 'bg-orange-100' },
  BPCL: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600', badge: 'bg-green-100' },
};

const getTypeColor = (type) => TYPE_COLORS[type] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-600', badge: 'bg-slate-100' };

const PlantList = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [plants, setPlants] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
  const [viewPlant, setViewPlant] = useState(null);
  const [viewPlantData, setViewPlantData] = useState(null);
  const [plantIncharge, setPlantIncharge] = useState(null);
  const [plantVehicles, setPlantVehicles] = useState([]);
  const [plantDrivers, setPlantDrivers] = useState([]);
  const [loadingPlantData, setLoadingPlantData] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [editingIncharge, setEditingIncharge] = useState(false);
  const [inchargeUsers, setInchargeUsers] = useState([]);
  const [selectedInchargeId, setSelectedInchargeId] = useState('');
  const [savingIncharge, setSavingIncharge] = useState(false);

  useEffect(() => {
    fetchPlants();
    fetchStats();
  }, []);

  useEffect(() => { registerRefresh(fetchPlants); }, []);

  const fetchPlants = async () => {
    try {
      const response = await api.get('/plants');
      setPlants(response.data);
    } catch (error) {
      toast.error('Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/plants/stats/vehicles');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load plant stats');
    }
  };

  const getPlantStats = (plantName) => {
    const stat = stats.find(s => s._id === plantName);
    return stat || { total_vehicles: 0, active_vehicles: 0 };
  };

  const handleViewPlant = async (plant) => {
    setViewPlant(plant.plant_name);
    setViewPlantData(plant);
    setPlantIncharge(null);
    setLoadingPlantData(true);
    try {
      const [vehRes, drvRes, usersRes] = await Promise.all([
        api.get(`/vehicles?plant=${encodeURIComponent(plant.plant_name)}`),
        api.get(`/drivers?plant=${encodeURIComponent(plant.plant_name)}`),
        api.get('/users'),
      ]);
      setPlantVehicles(vehRes.data);
      setPlantDrivers(drvRes.data);
      // Find incharge: either by plant_incharge_id on plant record, or by user with role=plant_incharge and matching plant
      const incharge = usersRes.data.find(u =>
        (plant.plant_incharge_id && u.id === plant.plant_incharge_id) ||
        (u.role === 'plant_incharge' && u.plant === plant.plant_name)
      );
      setPlantIncharge(incharge || null);
    } catch (error) {
      toast.error('Failed to load plant data');
    } finally {
      setLoadingPlantData(false);
    }
  };

  const closePlantView = () => {
    setViewPlant(null);
    setViewPlantData(null);
    setPlantIncharge(null);
    setPlantVehicles([]);
    setPlantDrivers([]);
    setEditingIncharge(false);
    setSelectedInchargeId('');
  };

  const handleStartEditIncharge = async () => {
    try {
      const res = await api.get('/users');
      setInchargeUsers(res.data.filter(u => u.role === 'plant_incharge' && u.status === 'active'));
    } catch { /* ignore */ }
    setSelectedInchargeId(plantIncharge?.id || '');
    setEditingIncharge(true);
  };

  const handleSaveIncharge = async () => {
    if (!viewPlantData) return;
    setSavingIncharge(true);
    try {
      // Update plant record with new plant_incharge_id
      await api.put(`/plants/${viewPlantData.id}`, {
        plant_name: viewPlantData.plant_name,
        plant_type: viewPlantData.plant_type,
        city: viewPlantData.city,
        state: viewPlantData.state,
        contact_phone: viewPlantData.contact_phone || null,
        contact_email: viewPlantData.contact_email || null,
        plant_incharge_id: selectedInchargeId || null,
      });
      // Also update the user's plant field so portal works
      if (selectedInchargeId) {
        const inchargeUser = inchargeUsers.find(u => u.id === selectedInchargeId);
        if (inchargeUser && !inchargeUser.plant) {
          await api.put(`/users/${selectedInchargeId}`, { plant: viewPlantData.plant_name });
        }
      }
      toast.success('Plant incharge updated');
      setEditingIncharge(false);
      // Refresh the view
      handleViewPlant(viewPlantData);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update incharge');
    } finally {
      setSavingIncharge(false);
    }
  };

  const handleDeletePlant = async (e, plant) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${plant.plant_name}"?`)) return;
    try {
      await api.delete(`/plants/${plant.id}`);
      toast.success('Plant deleted successfully');
      fetchPlants();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete plant');
    }
  };

  const canCreate = ['admin', 'superuser'].includes(user?.role);

  // Group plants by type
  const groupedByType = plants.reduce((acc, plant) => {
    const type = plant.plant_type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(plant);
    return acc;
  }, {});

  // Calculate totals per type
  const typeCards = Object.entries(groupedByType).map(([type, typePlants]) => {
    const totalVehicles = typePlants.reduce((sum, p) => sum + (getPlantStats(p.plant_name).total_vehicles || 0), 0);
    const activeVehicles = typePlants.reduce((sum, p) => sum + (getPlantStats(p.plant_name).active_vehicles || 0), 0);
    return { type, count: typePlants.length, totalVehicles, activeVehicles };
  });

  const filteredPlants = selectedType ? (groupedByType[selectedType] || []) : [];

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="plant-list-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedType && (
            <Button variant="ghost" onClick={() => setSelectedType(null)} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {selectedType ? `${selectedType} Plants` : 'Plants & Locations'}
            </h1>
            <p className="text-slate-600 mt-1">
              {selectedType
                ? `${filteredPlants.length} plant${filteredPlants.length !== 1 ? 's' : ''} under ${selectedType}`
                : 'Manage plant locations across operations'}
            </p>
          </div>
        </div>
        {canCreate && (
          <Link to="/plants/new">
            <Button className="bg-slate-900 hover:bg-slate-800" data-testid="add-plant-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Plant
            </Button>
          </Link>
        )}
      </div>

      {/* Type Cards View */}
      {!selectedType && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {typeCards.map(({ type, count, totalVehicles, activeVehicles }) => {
              const colors = getTypeColor(type);
              return (
                <Card
                  key={type}
                  className={`${colors.border} cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => setSelectedType(type)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${colors.badge} flex items-center justify-center`}>
                        <Building className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge} ${colors.text}`}>
                        {count} Plant{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className={`text-xl font-bold ${colors.text}`} style={{ fontFamily: 'Chivo, sans-serif' }}>
                      {type}
                    </h3>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-500">Vehicles:</span>
                        <span className="text-sm font-bold text-slate-900">{totalVehicles}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-500">Active:</span>
                        <span className="text-sm font-semibold text-emerald-600">{activeVehicles}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {plants.length === 0 && (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center text-slate-500">
                No plants found
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Individual Plant Cards (after clicking a type) */}
      {selectedType && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => {
            const plantStats = getPlantStats(plant.plant_name);
            return (
              <Card key={plant.id} className="border-slate-200 hover:shadow-lg transition-shadow" data-testid={`plant-card-${plant.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Building className="h-5 w-5 mr-2 text-blue-600" />
                    {plant.plant_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <span className="text-slate-500 w-20">Type:</span>
                      <span className="font-medium text-slate-900">{plant.plant_type}</span>
                    </div>
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">{plant.city}</p>
                        <p className="text-slate-500">{plant.state}</p>
                      </div>
                    </div>
                    {plant.contact_phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-slate-700">{plant.contact_phone}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Vehicles:</span>
                        <span className="font-bold text-slate-900">{plantStats.total_vehicles}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-slate-500">Active:</span>
                        <span className="font-semibold text-emerald-600">{plantStats.active_vehicles}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewPlant(plant)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        View Vehicles & Drivers
                      </Button>
                      {canCreate && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                          onClick={(e) => handleDeletePlant(e, plant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Plant Vehicles & Drivers Dialog */}
      <Dialog open={!!viewPlant} onOpenChange={closePlantView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <Building className="h-5 w-5 mr-2 text-blue-600" />
              {viewPlant}
            </DialogTitle>
            {viewPlantData && (
              <p className="text-sm text-slate-500 mt-1">
                {viewPlantData.plant_type} &middot; {viewPlantData.city}, {viewPlantData.state}
              </p>
            )}
          </DialogHeader>

          {loadingPlantData ? (
            <TruckLoader />
          ) : (
            <div className="space-y-6 mt-4">
              {/* Plant Incharge */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Plant Incharge
                  </h3>
                  {canCreate && !editingIncharge && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 h-7 px-2"
                      onClick={handleStartEditIncharge}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      {plantIncharge ? 'Change' : 'Assign'}
                    </Button>
                  )}
                </div>

                {editingIncharge ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select value={selectedInchargeId} onValueChange={setSelectedInchargeId}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select plant incharge" />
                        </SelectTrigger>
                        <SelectContent>
                          {inchargeUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700 h-9 w-9 shrink-0"
                      disabled={savingIncharge}
                      onClick={handleSaveIncharge}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setEditingIncharge(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : plantIncharge ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{plantIncharge.name}</p>
                      <p className="text-xs text-slate-500">{plantIncharge.email}</p>
                      {plantIncharge.phone && (
                        <p className="text-xs text-slate-500">{plantIncharge.phone}</p>
                      )}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {plantIncharge.status || 'active'}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No plant incharge assigned</p>
                )}
              </div>

              {/* Vehicles */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  Vehicles ({plantVehicles.length})
                </h3>
                {plantVehicles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No vehicles at this plant</p>
                ) : (
                  <div className="space-y-2">
                    {plantVehicles.map((veh) => (
                      <div
                        key={veh.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                        onClick={() => setSelectedVehicleId(veh.engine_no)}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <Truck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{veh.vehicle_no}</p>
                            <p className="text-xs text-slate-500 truncate">{veh.make} {veh.capacity ? `| ${veh.capacity}` : ''}</p>
                          </div>
                        </div>
                        <div className="hidden sm:block text-right min-w-0 mx-4">
                          <p className="text-xs text-slate-400">Driver</p>
                          <p className="text-sm text-slate-700 truncate">{veh.assigned_driver_name || '—'}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="flex-shrink-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drivers */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Drivers ({plantDrivers.length})
                </h3>
                {plantDrivers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No drivers at this plant</p>
                ) : (
                  <div className="space-y-2">
                    {plantDrivers.map((drv) => (
                      <div
                        key={drv.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                        onClick={() => setSelectedDriverId(drv.id)}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{drv.name}</p>
                            <p className="text-xs text-slate-500 truncate">EMP: {drv.emp_id}</p>
                          </div>
                        </div>
                        <div className="hidden sm:block text-right min-w-0 mx-4">
                          <p className="text-xs text-slate-400">Vehicle</p>
                          <p className="text-sm text-slate-700 truncate">{drv.allocated_vehicle || '—'}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="flex-shrink-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        isOpen={!!selectedVehicleId}
        onClose={() => setSelectedVehicleId(null)}
        vehicleId={selectedVehicleId}
        onUpdate={() => { fetchStats(); if (viewPlantData) handleViewPlant(viewPlantData); }}
      />

      {/* Driver Detail Modal */}
      <DriverDetailModal
        isOpen={!!selectedDriverId}
        onClose={() => setSelectedDriverId(null)}
        driverId={selectedDriverId}
        onUpdate={() => { if (viewPlantData) handleViewPlant(viewPlantData); }}
      />
    </div>
  );
};

export default PlantList;
