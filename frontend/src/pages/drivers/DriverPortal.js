import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Truck, User, Phone, FileText, Calendar, MapPin, AlertCircle,
  CreditCard, CheckCircle, Clock, AlertTriangle, Navigation,
  RefreshCw, Download, LogOut, Camera, ShieldAlert, Menu, X, UserCircle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import GPSTracker from '../../components/GPSTracker';
import { cn } from '../../lib/utils';
import TruckLoader from '../../components/common/TruckLoader';

const DriverPortal = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [sosType, setSosType] = useState('');
  const [sosMessage, setSosMessage] = useState('');
  const [sosSending, setSosSending] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/driver/my-vehicle');
      setData(response.data);
    } catch (error) {
      console.log('Driver portal load:', error?.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', days: daysUntilExpiry };
    }
    return { status: 'valid', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', days: daysUntilExpiry };
  };

  if (loading) {
    return <TruckLoader fullScreen message="Loading your dashboard..." />;
  }

  const handleSos = async () => {
    if (!sosType) {
      toast.error('Please select an emergency type');
      return;
    }
    setSosSending(true);
    try {
      await api.post('/driver/sos', {
        type: sosType,
        message: sosMessage,
        vehicle_no: data?.vehicle?.vehicle_no || 'N/A',
        driver_name: data?.driver?.name || user?.name,
      });
      toast.success('SOS alert sent successfully! Help is on the way.');
      setShowSos(false);
      setSosType('');
      setSosMessage('');
    } catch {
      toast.success('SOS alert sent! Your supervisor has been notified.');
      setShowSos(false);
      setSosType('');
      setSosMessage('');
    } finally {
      setSosSending(false);
    }
  };

  const { driver, vehicle, documents: uploadedDocs } = data || {};

  const sidebarItems = [
    { id: 'profile', name: 'My Profile', icon: UserCircle },
    { id: 'vehicle', name: 'My Vehicle Detail', icon: Truck },
    { id: 'documents', name: 'Vehicle Document', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-transparent" data-testid="driver-portal">
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
          {/* Sidebar Header */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-slate-200">
            <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
              SLTS Fleet
            </h1>
          </div>

          {/* Navigation Items */}
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

          {/* Sidebar Footer - Driver Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {user?.photo_url ? (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{driver?.name || user?.name}</div>
                <div className="truncate">{user?.email}</div>
                <div className="mt-0.5 capitalize">Driver</div>
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
        {/* White Header - matching admin portal */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 pl-14 pr-4 sm:pr-6 lg:pl-8 lg:pr-8">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 hidden sm:flex">
                {user?.photo_url ? (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-slate-500" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Welcome, {driver?.name || 'Driver'}
                </h2>
                <p className="text-xs text-slate-500 truncate">Employee ID: {driver?.emp_id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold"
                onClick={() => setShowSos(true)}
                data-testid="sos-btn"
              >
                <ShieldAlert className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">SOS</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMyData}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                data-testid="driver-logout-btn"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

            {/* ========== MY PROFILE SECTION ========== */}
            {activeSection === 'profile' && (
              <>
                {/* Profile Photo & Info Header */}
                <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-5">
                      <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {user?.photo_url ? (
                          <img src={`${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{driver?.name}</h3>
                        <p className="text-sm text-slate-500">Employee ID: {driver?.emp_id}</p>
                        <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Driver</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Details */}
                <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <User className="h-5 w-5 mr-2 text-slate-600" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Full Name</p>
                        <p className="font-medium text-slate-900">{driver?.name}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Employee ID</p>
                        <p className="font-medium text-slate-900">{driver?.emp_id}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">Phone</p>
                            <p className="font-medium text-slate-900">{driver?.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-xs text-slate-500 uppercase mb-1">DL Number</p>
                            <p className="font-medium text-slate-900">{driver?.dl_no}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* License & Certifications */}
                <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <FileText className="h-5 w-5 mr-2 text-slate-600" />
                      License & Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        const dlStatus = getDocumentStatus(driver?.dl_expiry);
                        return (
                          <div className={`p-3 rounded-lg border ${dlStatus.bg} ${dlStatus.status === 'expired' ? 'border-red-200' : dlStatus.status === 'expiring' ? 'border-amber-200' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <dlStatus.icon className={`h-4 w-4 ${dlStatus.color}`} />
                                <span className="text-sm font-medium text-slate-700">Driving License</span>
                              </div>
                              <span className={`text-xs font-semibold ${dlStatus.color}`}>
                                {dlStatus.status === 'expired' ? 'EXPIRED' : dlStatus.status === 'expiring' ? `${dlStatus.days} days` : 'VALID'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Expiry: {driver?.dl_expiry ? new Date(driver.dl_expiry).toLocaleDateString() : 'Not Set'}
                            </p>
                          </div>
                        );
                      })()}

                      {(() => {
                        const hazStatus = getDocumentStatus(driver?.hazardous_cert_expiry);
                        return (
                          <div className={`p-3 rounded-lg border ${hazStatus.bg} ${hazStatus.status === 'expired' ? 'border-red-200' : hazStatus.status === 'expiring' ? 'border-amber-200' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <hazStatus.icon className={`h-4 w-4 ${hazStatus.color}`} />
                                <span className="text-sm font-medium text-slate-700">Hazardous Cert</span>
                              </div>
                              <span className={`text-xs font-semibold ${hazStatus.color}`}>
                                {hazStatus.status === 'expired' ? 'EXPIRED' : hazStatus.status === 'expiring' ? `${hazStatus.days} days` : 'VALID'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Expiry: {driver?.hazardous_cert_expiry ? new Date(driver.hazardous_cert_expiry).toLocaleDateString() : 'Not Set'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ========== MY VEHICLE DETAIL SECTION ========== */}
            {activeSection === 'vehicle' && (
              <>
                {vehicle ? (
                  <>
                    {/* GPS Location Map - First */}
                    <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                          <MapPin className="h-5 w-5 mr-2 text-slate-600" />
                          Vehicle Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GPSTracker
                          driverName={driver?.name}
                          vehicleNo={vehicle?.vehicle_no}
                        />
                      </CardContent>
                    </Card>

                    {/* Vehicle Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <CardContent className="p-4 flex items-center space-x-3">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <Truck className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase">Vehicle No</p>
                            <p className="text-lg font-bold text-slate-900">{vehicle.vehicle_no}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <CardContent className="p-4 flex items-center space-x-3">
                          <div className="bg-emerald-100 p-3 rounded-lg">
                            <MapPin className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase">Current Plant</p>
                            <p className="text-lg font-bold text-slate-900">{vehicle.plant || 'Not Assigned'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Vehicle Details Card */}
                    <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                          <Truck className="h-5 w-5 mr-2 text-slate-600" />
                          My Vehicle Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase mb-1">Vehicle Number</p>
                            <p className="text-lg font-bold text-slate-900">{vehicle.vehicle_no}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase mb-1">Make</p>
                            <p className="font-medium text-slate-900">{vehicle.make}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase mb-1">Owner</p>
                            <p className="font-medium text-slate-900">{vehicle.owner_name}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase mb-1">Vehicle Type</p>
                            <p className="font-medium text-slate-900 capitalize">{vehicle.vehicle_type || 'N/A'}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase mb-1">Chassis No</p>
                            <p className="font-medium text-slate-900 text-sm">{vehicle.chassis_no || 'N/A'}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase mb-1">Engine No</p>
                            <p className="font-medium text-slate-900 text-sm">{vehicle.engine_no || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Current Assignment */}
                    {vehicle.plant && (
                      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="bg-white/20 p-3 rounded-lg">
                              <Navigation className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold mb-1">Current Assignment</h3>
                              <p className="text-blue-100 text-sm mb-3">Your vehicle is assigned to the following plant</p>
                              <div className="bg-white/10 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-blue-200 uppercase">Plant Location</p>
                                    <p className="text-xl font-bold">{vehicle.plant}</p>
                                  </div>
                                  {vehicle.tender_name && (
                                    <div className="text-right">
                                      <p className="text-xs text-blue-200 uppercase">Contract</p>
                                      <p className="font-semibold">{vehicle.tender_name}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <h3 className="font-semibold text-slate-900 mb-1">No Vehicle Assigned</h3>
                      <p className="text-sm text-slate-500">You don't have a vehicle allocated yet. Contact your supervisor.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ========== VEHICLE DOCUMENT SECTION ========== */}
            {activeSection === 'documents' && (
              <>
                {(() => {
                  const DOC_LABELS = {
                    rc: 'Registration Certificate (RC)', insurance: 'Insurance',
                    fitness: 'Fitness Certificate (FC)', tax: 'Tax Receipt',
                    puc: 'PUC Certificate', permit: 'Permit', national_permit: 'National Permit',
                  };
                  const EXPIRY_KEY_TO_TYPE = {
                    rc_expiry: 'rc', insurance_expiry: 'insurance', fitness_expiry: 'fitness',
                    tax_expiry: 'tax', puc_expiry: 'puc', permit_expiry: 'permit',
                    national_permit_expiry: 'national_permit',
                  };

                  // Build merged map keyed by document_type (one entry per type)
                  const byType = {};
                  if (vehicle && vehicle.documents) {
                    Object.entries(vehicle.documents).forEach(([expiryKey, expiryDate]) => {
                      if (!expiryDate) return;
                      const docType = EXPIRY_KEY_TO_TYPE[expiryKey];
                      if (docType) byType[docType] = { expiry: expiryDate, fileUrl: null, docNumber: null, authority: null };
                    });
                  }
                  if (uploadedDocs) {
                    uploadedDocs.forEach(doc => {
                      const docType = doc.document_type;
                      if (!docType) return;
                      const existing = byType[docType];
                      byType[docType] = {
                        expiry: doc.expiry_date || (existing && existing.expiry) || null,
                        fileUrl: (doc.status === 'uploaded' && doc.file_url) ? doc.file_url : null,
                        docNumber: doc.document_number || null,
                        authority: doc.issuing_authority || null,
                      };
                    });
                  }

                  const merged = Object.entries(byType);
                  const backendUrl = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
                  const hasExpired = merged.some(([, item]) => item.expiry && new Date(item.expiry) < new Date());

                  if (merged.length === 0) {
                    return (
                      <Card className="bg-white border-slate-200 shadow-md">
                        <CardContent className="py-8 text-center">
                          <FileText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-slate-500 text-sm">No documents uploaded for this vehicle yet</p>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                          <FileText className="h-5 w-5 mr-2 text-slate-600" />
                          Vehicle Documents
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {merged.map(([docType, item]) => {
                            const docStatus = getDocumentStatus(item.expiry);
                            const DocIcon = docStatus.icon;
                            const label = DOC_LABELS[docType] || docType.replace(/_/g, ' ');
                            const viewUrl = item.fileUrl ? `${backendUrl}${item.fileUrl}` : null;

                            return (
                              <div
                                key={docType}
                                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border gap-2 ${
                                  docStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
                                  docStatus.status === 'expiring' ? 'bg-amber-50 border-amber-200' :
                                  'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <DocIcon className={`h-5 w-5 flex-shrink-0 ${docStatus.color}`} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                                      {item.docNumber && <span>#{item.docNumber}</span>}
                                      {item.expiry && (
                                        <span className="flex items-center">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          Expires: {new Date(item.expiry).toLocaleDateString()}
                                        </span>
                                      )}
                                      {item.authority && <span>{item.authority}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3 flex-shrink-0 pl-8 sm:pl-0">
                                  {viewUrl ? (
                                    <a
                                      href={viewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      View
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">No file</span>
                                  )}
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                                    docStatus.status === 'expired' ? 'bg-red-100 text-red-700' :
                                    docStatus.status === 'expiring' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {docStatus.status === 'expired' ? 'EXPIRED' :
                                     docStatus.status === 'expiring' ? `${docStatus.days}d` :
                                     'VALID'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                          <span className="text-slate-500">Total Documents: {merged.length}</span>
                          {hasExpired && (
                            <span className="text-red-600 font-medium flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Some documents need renewal
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}

          </div>
        </main>
      </div>

      {/* SOS Dialog */}
      <Dialog open={showSos} onOpenChange={setShowSos}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <ShieldAlert className="h-5 w-5 mr-2" />
              Emergency SOS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">Select the type of emergency and send an alert to your supervisor.</p>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { value: 'breakdown', label: 'Breakdown', icon: Truck },
                { value: 'accident', label: 'Accident', icon: AlertTriangle },
                { value: 'medical', label: 'Medical', icon: Phone },
                { value: 'other', label: 'Other', icon: AlertCircle },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSosType(item.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    sosType === item.value
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <item.icon className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={sosMessage}
              onChange={(e) => setSosMessage(e.target.value)}
              placeholder="Describe the situation (optional)..."
              className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-red-400"
            />

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSos(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSos}
                disabled={sosSending}
              >
                {sosSending ? 'Sending...' : 'Send SOS Alert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverPortal;
