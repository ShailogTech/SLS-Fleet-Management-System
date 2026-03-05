import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Truck, User, Phone, Eye,
  CheckCircle, Clock, AlertTriangle,
  RefreshCw, Menu, X, UserCircle, Users, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import TruckLoader from '../../components/common/TruckLoader';
import VehicleDetailModal from '../../components/modals/VehicleDetailModal';
import DriverDetailModal from '../../components/modals/DriverDetailModal';

const PlantInchargePortal = () => {
  const { user, logout } = useAuth();
  const [plantData, setPlantData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('plant');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  useEffect(() => {
    fetchPlantData();
  }, []);

  const fetchPlantData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plant-portal/my-plant');
      setPlantData(res.data);
    } catch (error) {
      console.log('Plant portal load:', error?.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/plant-portal/vehicles');
      setVehicles(res.data);
    } catch (error) {
      toast.error('Failed to load vehicles');
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/plant-portal/drivers');
      setDrivers(res.data);
    } catch (error) {
      toast.error('Failed to load drivers');
    }
  };

  useEffect(() => {
    if (activeSection === 'vehicles' && vehicles.length === 0) fetchVehicles();
    if (activeSection === 'drivers' && drivers.length === 0) fetchDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const handleRefresh = () => {
    setVehicles([]);
    setDrivers([]);
    fetchPlantData();
    if (activeSection === 'vehicles') fetchVehicles();
    if (activeSection === 'drivers') fetchDrivers();
  };

  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return { status: 'expired', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', days: daysUntilExpiry };
    if (daysUntilExpiry <= 30) return { status: 'expiring', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', days: daysUntilExpiry };
    return { status: 'valid', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', days: daysUntilExpiry };
  };

  if (loading) {
    return <TruckLoader fullScreen message="Loading plant dashboard..." />;
  }

  const sidebarItems = [
    { id: 'plant', name: 'My Plant', icon: Building },
    { id: 'vehicles', name: 'Vehicles', icon: Truck },
    { id: 'drivers', name: 'Drivers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-900 text-white"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-gray-300 border-r border-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 border-b border-slate-200">
            <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
              SLTS Fleet
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    activeSection === item.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                <Building className="h-5 w-5 text-slate-400" />
              </div>
              <div className="text-xs text-slate-500 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{plantData?.plant_names?.join(', ') || plantData?.plant_name || 'Plant Incharge'}</div>
                <div className="truncate">{user?.email}</div>
                <div className="mt-0.5 capitalize">Plant Incharge</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 pl-14 pr-4 sm:pr-6 lg:pl-8 lg:pr-8">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0 hidden sm:flex">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {plantData?.plant_names?.join(', ') || plantData?.plant_name || 'Plant Dashboard'}
                </h2>
                <p className="text-xs text-slate-500 truncate">Plant Incharge Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <button onClick={logout} className="logout-btn" data-testid="logout-btn">
                <div className="logout-btn-sign">
                  <svg viewBox="0 0 512 512">
                    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                  </svg>
                </div>
                <div className="logout-btn-text">Logout</div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

            {/* ========== MY PLANT SECTION ========== */}
            {activeSection === 'plant' && (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Plant</p>
                        <p className="text-lg font-bold text-slate-900">{plantData?.plant_names?.join(', ') || plantData?.plant_name || 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                    onClick={() => setActiveSection('vehicles')}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-emerald-100 p-3 rounded-lg">
                          <Truck className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Vehicles</p>
                          <p className="text-lg font-bold text-slate-900">{plantData?.vehicle_count || 0}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </Button>
                    </CardContent>
                  </Card>
                  <Card
                    className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                    onClick={() => setActiveSection('drivers')}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-3 rounded-lg">
                          <Users className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Drivers</p>
                          <p className="text-lg font-bold text-slate-900">{plantData?.driver_count || 0}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Plant Details */}
                {plantData?.plants?.length > 0 && (
                  <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Building className="h-5 w-5 mr-2 text-slate-600" />
                        Plant Details ({plantData.plants.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {plantData.plants.map((p) => (
                        <div key={p.id || p.plant_name} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Plant Name</p>
                            <p className="font-medium text-slate-900">{p.plant_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Type</p>
                            <p className="font-medium text-slate-900">{p.plant_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">City</p>
                            <p className="font-medium text-slate-900">{p.city || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                              p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* My Info */}
                <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <UserCircle className="h-5 w-5 mr-2 text-slate-600" />
                      My Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Name</p>
                        <p className="font-medium text-slate-900">{plantData?.user?.name || user?.name}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Email</p>
                        <p className="font-medium text-slate-900">{plantData?.user?.email || user?.email}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Phone</p>
                        <p className="font-medium text-slate-900">{plantData?.user?.phone || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Role</p>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Plant Incharge
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ========== VEHICLES SECTION ========== */}
            {activeSection === 'vehicles' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Vehicles ({vehicles.length})
                  </h3>
                </div>

                {vehicles.length === 0 ? (
                  <Card className="bg-white border-slate-200 shadow-md">
                    <CardContent className="py-12 text-center">
                      <Truck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <h3 className="font-semibold text-slate-900 mb-1">No Vehicles Found</h3>
                      <p className="text-sm text-slate-500">No vehicles are assigned to this plant.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {vehicles.map((veh) => {
                      const docs = veh.documents || {};
                      const expiryKeys = ['rc_expiry', 'insurance_expiry', 'fitness_expiry', 'tax_expiry', 'puc_expiry', 'permit_expiry', 'national_permit_expiry'];
                      const hasExpired = expiryKeys.some(k => docs[k] && new Date(docs[k]) < new Date());
                      const hasExpiring = expiryKeys.some(k => {
                        if (!docs[k]) return false;
                        const days = Math.ceil((new Date(docs[k]) - new Date()) / 86400000);
                        return days >= 0 && days <= 30;
                      });
                      const dotColor = hasExpired ? 'bg-red-500' : hasExpiring ? 'bg-amber-500' : 'bg-emerald-500';

                      return (
                        <Card
                          key={veh.id}
                          className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-slate-300"
                          onClick={() => setSelectedVehicleId(veh.id)}
                        >
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              <div className="relative flex-shrink-0">
                                <div className="bg-slate-100 p-2.5 rounded-lg">
                                  <Truck className="h-5 w-5 text-slate-600" />
                                </div>
                                <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dotColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">{veh.vehicle_no}</p>
                                <p className="text-xs text-slate-500 truncate">{veh.make} {veh.capacity ? `| ${veh.capacity}` : ''}</p>
                              </div>
                              <div className="hidden sm:block text-right min-w-0">
                                <p className="text-xs text-slate-400">Driver</p>
                                <p className="text-sm text-slate-700 truncate">{veh.assigned_driver_name || '—'}</p>
                              </div>
                              <div className="hidden md:block text-right min-w-0">
                                <p className="text-xs text-slate-400">Owner</p>
                                <p className="text-sm text-slate-700 truncate">{veh.owner_name || '—'}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); setSelectedVehicleId(veh.id); }}
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              View
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ========== DRIVERS SECTION ========== */}
            {activeSection === 'drivers' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Drivers ({drivers.length})
                  </h3>
                </div>

                {drivers.length === 0 ? (
                  <Card className="bg-white border-slate-200 shadow-md">
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <h3 className="font-semibold text-slate-900 mb-1">No Drivers Found</h3>
                      <p className="text-sm text-slate-500">No drivers are assigned to this plant.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {drivers.map((drv) => {
                      const dlStatus = getDocumentStatus(drv.dl_expiry);
                      const hazStatus = getDocumentStatus(drv.hazardous_cert_expiry);
                      const hasExpired = dlStatus.status === 'expired' || hazStatus.status === 'expired';
                      const hasExpiring = dlStatus.status === 'expiring' || hazStatus.status === 'expiring';
                      const dotColor = hasExpired ? 'bg-red-500' : hasExpiring ? 'bg-amber-500' : 'bg-emerald-500';

                      return (
                        <Card
                          key={drv.id}
                          className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-slate-300"
                          onClick={() => setSelectedDriverId(drv.id)}
                        >
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              <div className="relative flex-shrink-0">
                                <div className="bg-slate-100 p-2.5 rounded-lg">
                                  <User className="h-5 w-5 text-slate-600" />
                                </div>
                                <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dotColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">{drv.name}</p>
                                <p className="text-xs text-slate-500 truncate">EMP: {drv.emp_id}</p>
                              </div>
                              <div className="hidden sm:block text-right min-w-0">
                                <p className="text-xs text-slate-400">Phone</p>
                                <p className="text-sm text-slate-700 truncate">{drv.phone || '—'}</p>
                              </div>
                              <div className="hidden md:block text-right min-w-0">
                                <p className="text-xs text-slate-400">Vehicle</p>
                                <p className="text-sm text-slate-700 truncate">{drv.allocated_vehicle || '—'}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); setSelectedDriverId(drv.id); }}
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              View
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        isOpen={!!selectedVehicleId}
        onClose={() => setSelectedVehicleId(null)}
        vehicleId={selectedVehicleId}
        onUpdate={fetchVehicles}
      />

      {/* Driver Detail Modal */}
      <DriverDetailModal
        isOpen={!!selectedDriverId}
        onClose={() => setSelectedDriverId(null)}
        driverId={selectedDriverId}
        onUpdate={fetchDrivers}
      />
    </div>
  );
};

export default PlantInchargePortal;
