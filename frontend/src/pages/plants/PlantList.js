import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, MapPin, Building, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';

const PlantList = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [plants, setPlants] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="plant-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Plants & Locations
          </h1>
          <p className="text-slate-600 mt-1">Manage plant locations across operations</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plants.map((plant) => {
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

      {plants.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            No plants found
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlantList;
