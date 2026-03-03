import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Truck, User, Phone, FileText, Calendar, Eye,
  CheckCircle, Clock, AlertTriangle,
  RefreshCw, LogOut, Menu, X, UserCircle, Users, Building
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
                <div className="font-semibold text-slate-900 truncate">{plantData?.plant_name || 'Plant Incharge'}</div>
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
                  {plantData?.plant_name || 'Plant Dashboard'}
                </h2>
                <p className="text-xs text-slate-500 truncate">Plant Incharge Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
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
                        <p className="text-lg font-bold text-slate-900">{plantData?.plant_name || 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <Truck className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Vehicles</p>
                        <p className="text-lg font-bold text-slate-900">{plantData?.vehicle_count || 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Drivers</p>
                        <p className="text-lg font-bold text-slate-900">{plantData?.driver_count || 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plant Details */}
                {plantData?.plant && (
                  <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Building className="h-5 w-5 mr-2 text-slate-600" />
                        Plant Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase mb-1">Plant Name</p>
                          <p className="font-medium text-slate-900">{plantData.plant.plant_name}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase mb-1">Plant Type</p>
                          <p className="font-medium text-slate-900">{plantData.plant.plant_type || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase mb-1">City</p>
                          <p className="font-medium text-slate-900">{plantData.plant.city || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                            plantData.plant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {plantData.plant.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
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
                    Vehicles at {plantData?.plant_name} ({vehicles.length})
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
                      const expiredCount = expiryKeys.filter(k => docs[k] && new Date(docs[k]) < new Date()).length;
                      const validCount = expiryKeys.filter(k => docs[k] && new Date(docs[k]) >= new Date()).length;

                      return (
                        <Card
                          key={veh.id}
                          className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300"
                          onClick={() => setSelectedVehicleId(veh.id)}
                        >
                          <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              {/* Left: Vehicle info */}
                              <div className="flex items-start space-x-4 flex-1">
                                <div className="bg-blue-100 p-3 rounded-xl flex-shrink-0">
                                  <Truck className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-base font-bold text-slate-900">{veh.vehicle_no}</p>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                      veh.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                      veh.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {veh.status?.toUpperCase()}
                                    </span>
                                    {expiredCount > 0 && (
                                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 flex items-center">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {expiredCount} expired
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-500 mt-0.5">{veh.make} {veh.capacity ? `| ${veh.capacity}` : ''}</p>

                                  {/* Info grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3">
                                    <div>
                                      <p className="text-xs text-slate-400 uppercase">Owner</p>
                                      <p className="text-sm font-medium text-slate-700 truncate">{veh.owner_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400 uppercase">Driver</p>
                                      <p className="text-sm font-medium text-slate-700 truncate">{veh.assigned_driver_name || 'Unassigned'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400 uppercase">Engine No</p>
                                      <p className="text-sm font-medium text-slate-700 truncate">{veh.engine_no || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right: View button */}
                              <div className="flex items-center flex-shrink-0 pl-12 sm:pl-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={(e) => { e.stopPropagation(); setSelectedVehicleId(veh.id); }}
                                >
                                  <Eye className="h-4 w-4 mr-1.5" />
                                  View Details
                                </Button>
                              </div>
                            </div>

                            {/* Document expiry strip */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                              {[
                                { key: 'rc_expiry', label: 'RC' },
                                { key: 'insurance_expiry', label: 'INS' },
                                { key: 'fitness_expiry', label: 'FC' },
                                { key: 'tax_expiry', label: 'TAX' },
                                { key: 'puc_expiry', label: 'PUC' },
                                { key: 'permit_expiry', label: 'PMT' },
                                { key: 'national_permit_expiry', label: 'NP' },
                              ].map(({ key, label }) => {
                                const st = getDocumentStatus(docs[key]);
                                const StIcon = st.icon;
                                return (
                                  <span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border ${
                                    st.status === 'expired' ? 'bg-red-50 border-red-200 text-red-700' :
                                    st.status === 'expiring' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    st.status === 'valid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}>
                                    <StIcon className="h-3 w-3" />
                                    {label}: {docs[key] ? new Date(docs[key]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A'}
                                  </span>
                                );
                              })}
                            </div>
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
                    Drivers at {plantData?.plant_name} ({drivers.length})
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drivers.map((drv) => {
                      const dlStatus = getDocumentStatus(drv.dl_expiry);
                      const hazStatus = getDocumentStatus(drv.hazardous_cert_expiry);
                      const DlIcon = dlStatus.icon;
                      const HazIcon = hazStatus.icon;

                      return (
                        <Card
                          key={drv.id}
                          className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-purple-300"
                          onClick={() => setSelectedDriverId(drv.id)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <div className="bg-purple-100 p-2.5 rounded-xl flex-shrink-0">
                                  <User className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-slate-900">{drv.name}</p>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                      drv.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>
                                      {drv.status?.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-0.5">EMP: {drv.emp_id}</p>

                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                    {drv.phone && (
                                      <p className="text-sm text-slate-600 flex items-center">
                                        <Phone className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                        {drv.phone}
                                      </p>
                                    )}
                                    {drv.allocated_vehicle && (
                                      <p className="text-sm text-slate-600 flex items-center">
                                        <Truck className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                        {drv.allocated_vehicle}
                                      </p>
                                    )}
                                    {drv.dl_no && (
                                      <p className="text-sm text-slate-600 flex items-center">
                                        <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                        DL: {drv.dl_no}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* View button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-600 border-purple-200 hover:bg-purple-50 flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); setSelectedDriverId(drv.id); }}
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                View
                              </Button>
                            </div>

                            {/* Document status strip */}
                            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                dlStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
                                dlStatus.status === 'expiring' ? 'bg-amber-50 border-amber-200' :
                                dlStatus.status === 'valid' ? 'bg-emerald-50 border-emerald-200' :
                                'bg-slate-50 border-slate-200'
                              }`}>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">Driving License</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {drv.dl_expiry ? new Date(drv.dl_expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A'}
                                  </p>
                                </div>
                                <DlIcon className={`h-4 w-4 ${dlStatus.color}`} />
                              </div>
                              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                hazStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
                                hazStatus.status === 'expiring' ? 'bg-amber-50 border-amber-200' :
                                hazStatus.status === 'valid' ? 'bg-emerald-50 border-emerald-200' :
                                'bg-slate-50 border-slate-200'
                              }`}>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">Hazardous Cert</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {drv.hazardous_cert_expiry ? new Date(drv.hazardous_cert_expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A'}
                                  </p>
                                </div>
                                <HazIcon className={`h-4 w-4 ${hazStatus.color}`} />
                              </div>
                            </div>
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
