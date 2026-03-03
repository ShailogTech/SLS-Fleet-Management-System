import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, MapPin, Building, Phone, ArrowLeft, Truck } from 'lucide-react';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlantList;
