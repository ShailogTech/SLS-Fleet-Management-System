import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Truck, User, Phone, FileText, Calendar, MapPin, AlertCircle, 
  CreditCard, CheckCircle, Clock, AlertTriangle, Navigation,
  RefreshCw, Download, LogOut, Camera
} from 'lucide-react';
import { toast } from 'sonner';

const DriverPortal = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/driver/my-vehicle');
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load information');
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
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const { driver, vehicle, documents: uploadedDocs } = data || {};

  return (
    <div className="min-h-screen bg-slate-50" data-testid="driver-portal">
      {/* Header */}
      <div className="bg-slate-900 text-white py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-white overflow-hidden flex items-center justify-center">
                {user?.photo_url ? (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-slate-900" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Welcome, {driver?.name || 'Driver'}
                </h1>
                <p className="text-slate-300 text-sm">Employee ID: {driver?.emp_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                className="text-white border-white hover:bg-white hover:text-slate-900"
                onClick={fetchMyData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white hover:text-slate-900"
                onClick={logout}
                data-testid="driver-logout-btn"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Quick Stats */}
        {vehicle && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4 flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Your Vehicle</p>
                  <p className="text-lg font-bold text-slate-900">{vehicle.vehicle_no}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
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
        )}

        {/* Plant Route / Assignment Info */}
        {vehicle && vehicle.plant && (
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
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

        {/* My Profile */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <User className="h-5 w-5 mr-2 text-slate-600" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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

            {/* License Status */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-3">License & Certifications</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* DL Expiry */}
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

                {/* Hazardous Cert Expiry */}
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
            </div>
          </CardContent>
        </Card>

        {/* Allocated Vehicle Details */}
        {vehicle ? (
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Truck className="h-5 w-5 mr-2 text-slate-600" />
                My Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
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
        ) : (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-semibold text-slate-900 mb-1">No Vehicle Assigned</h3>
              <p className="text-sm text-slate-500">You don't have a vehicle allocated yet. Contact your supervisor.</p>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Documents */}
        {vehicle && vehicle.documents && Object.keys(vehicle.documents).length > 0 && (
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-slate-600" />
                Vehicle Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(vehicle.documents).map(([docType, expiryDate]) => {
                  if (!expiryDate) return null;
                  const docStatus = getDocumentStatus(expiryDate);
                  const DocIcon = docStatus.icon;
                  
                  return (
                    <div 
                      key={docType}
                      className={`p-4 rounded-lg border ${docStatus.bg} ${
                        docStatus.status === 'expired' ? 'border-red-200' : 
                        docStatus.status === 'expiring' ? 'border-amber-200' : 
                        'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <DocIcon className={`h-4 w-4 ${docStatus.color}`} />
                            <span className="text-sm font-semibold text-slate-700 capitalize">
                              {docType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center mt-2 text-xs text-slate-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expiry: {new Date(expiryDate).toLocaleDateString()}
                          </div>
                        </div>
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

              {/* Document Count Summary */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Total Documents: {Object.values(vehicle.documents).filter(v => v).length}
                </span>
                {Object.values(vehicle.documents).some(v => {
                  if (!v) return false;
                  return new Date(v) < new Date();
                }) && (
                  <span className="text-red-600 font-medium flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Some documents need renewal
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Documents Message */}
        {vehicle && (!vehicle.documents || Object.keys(vehicle.documents).length === 0) && (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-8 text-center">
              <FileText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-slate-500 text-sm">No documents uploaded for this vehicle yet</p>
            </CardContent>
          </Card>
        )}

        {/* Uploaded Document Files */}
        {uploadedDocs && uploadedDocs.length > 0 && (
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Download className="h-5 w-5 mr-2 text-slate-600" />
                Uploaded Document Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200" data-testid={`uploaded-doc-${doc.id}`}>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 capitalize">{doc.document_type?.replace(/_/g, ' ')}</p>
                        <div className="flex items-center space-x-3 text-xs text-slate-500">
                          {doc.document_number && <span>#{doc.document_number}</span>}
                          {doc.expiry_date && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                          {doc.issuing_authority && <span>{doc.issuing_authority}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.status === 'uploaded' && doc.file_url ? (
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                          data-testid={`download-doc-${doc.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Pending Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DriverPortal;
