import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Search, RefreshCw, Calendar, Eye, FileText, Truck, User } from 'lucide-react';
import { toast } from 'sonner';
import VehicleDetailModal from '../../components/modals/VehicleDetailModal';
import DriverDetailModal from '../../components/modals/DriverDetailModal';

const ALERT_ICONS = {
  critical: <AlertTriangle className="h-5 w-5 text-red-600" />,
  warning: <AlertCircle className="h-5 w-5 text-amber-600" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
};

const ALERT_STYLES = {
  critical: 'bg-red-50 border-red-200 hover:bg-red-100',
  warning: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
  info: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
};

const AlertCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [showAlertDetail, setShowAlertDetail] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    let filtered = alerts;
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.entity_type === typeFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredAlerts(filtered);
  }, [severityFilter, typeFilter, searchTerm, alerts]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/alerts');
      const formattedAlerts = response.data.map(alert => ({
        id: `${alert.entity_type}-${alert.entity_id}-${alert.document_type}`,
        type: alert.type,
        severity: alert.priority === 'high' ? 'critical' : 'warning',
        title: `${alert.entity_name} - ${alert.document_type.replace(/_/g, ' ').toUpperCase()}`,
        message: alert.type === 'expired' 
          ? `Document expired on ${alert.expiry_date}. Immediate action required!`
          : `Document expires on ${alert.expiry_date}. ${Math.ceil((new Date(alert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))} days remaining.`,
        entity_type: alert.entity_type,
        entity_id: alert.entity_id,
        entity_name: alert.entity_name,
        document_type: alert.document_type,
        expiry_date: alert.expiry_date,
        days_remaining: Math.ceil((new Date(alert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)),
      }));
      setAlerts(formattedAlerts);
      setFilteredAlerts(formattedAlerts);
    } catch (error) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClick = (alert) => {
    if (alert.entity_type === 'vehicle') {
      setSelectedVehicleId(alert.entity_id);
      setIsVehicleModalOpen(true);
    } else if (alert.entity_type === 'driver') {
      setSelectedDriverId(alert.entity_id);
      setIsDriverModalOpen(true);
    }
  };

  const handleViewDetail = (alert) => {
    setShowAlertDetail(alert);
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const vehicleAlerts = alerts.filter(a => a.entity_type === 'vehicle').length;
  const driverAlerts = alerts.filter(a => a.entity_type === 'driver').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="alert-center-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Alert Center
          </h1>
          <p className="text-slate-600 mt-1">Monitor critical notifications and document expiries</p>
        </div>
        <Button variant="outline" onClick={fetchAlerts} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Alerts</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{alerts.length}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Critical</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{criticalCount}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Warnings</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{warningCount}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">By Type</p>
                <p className="text-sm mt-1">
                  <span className="font-semibold text-slate-900">{vehicleAlerts}</span> Vehicles, 
                  <span className="font-semibold text-slate-900 ml-1">{driverAlerts}</span> Drivers
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name or document type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="alert-search-input"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]" data-testid="severity-filter">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]" data-testid="type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="vehicle">Vehicles</SelectItem>
            <SelectItem value="driver">Drivers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${ALERT_STYLES[alert.severity]}`}
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {ALERT_ICONS[alert.severity]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {alert.entity_type === 'vehicle' ? (
                            <Truck className="h-4 w-4 text-slate-500" />
                          ) : (
                            <User className="h-4 w-4 text-slate-500" />
                          )}
                          <h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-slate-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expiry: {new Date(alert.expiry_date).toLocaleDateString()}
                          </span>
                          {alert.days_remaining <= 0 ? (
                            <span className="text-xs font-semibold text-red-600">EXPIRED</span>
                          ) : (
                            <span className={`text-xs font-semibold ${alert.days_remaining <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                              {alert.days_remaining} days left
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          alert.severity === 'critical' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlertClick(alert);
                        }}
                        data-testid={`view-entity-${alert.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View {alert.entity_type === 'vehicle' ? 'Vehicle' : 'Driver'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(alert);
                        }}
                        data-testid={`view-detail-${alert.id}`}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Alert Details
                      </Button>
                      {alert.days_remaining <= 0 && (
                        <span className="ml-auto text-xs text-red-600 font-medium animate-pulse">
                          Immediate Action Required!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p className="font-medium">No alerts found</p>
                <p className="text-sm mt-1">
                  {alerts.length > 0 
                    ? 'Try adjusting your filters' 
                    : 'All documents are up to date'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedVehicleId(null);
        }}
        vehicleId={selectedVehicleId}
        onUpdate={fetchAlerts}
      />

      {/* Driver Detail Modal */}
      <DriverDetailModal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setSelectedDriverId(null);
        }}
        driverId={selectedDriverId}
        onUpdate={fetchAlerts}
      />

      {/* Alert Detail Modal */}
      <Dialog open={!!showAlertDetail} onOpenChange={() => setShowAlertDetail(null)}>
        <DialogContent className="max-w-lg" data-testid="alert-detail-modal">
          {showAlertDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  {ALERT_ICONS[showAlertDetail.severity]}
                  <DialogTitle>Alert Details</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Entity Type</p>
                    <p className="font-medium text-slate-900 capitalize">{showAlertDetail.entity_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Entity Name</p>
                    <p className="font-medium text-slate-900">{showAlertDetail.entity_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Document Type</p>
                    <p className="font-medium text-slate-900 capitalize">{showAlertDetail.document_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Expiry Date</p>
                    <p className="font-medium text-slate-900">{new Date(showAlertDetail.expiry_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Severity</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      showAlertDetail.severity === 'critical' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {showAlertDetail.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Days Remaining</p>
                    <p className={`font-medium ${showAlertDetail.days_remaining <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {showAlertDetail.days_remaining <= 0 ? 'EXPIRED' : `${showAlertDetail.days_remaining} days`}
                    </p>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  showAlertDetail.severity === 'critical' ? 'bg-red-50' : 'bg-amber-50'
                }`}>
                  <p className="text-sm font-medium text-slate-900">Recommended Action</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {showAlertDetail.days_remaining <= 0 
                      ? 'This document has expired. Please renew immediately to avoid operational issues.'
                      : `This document expires in ${showAlertDetail.days_remaining} days. Please initiate the renewal process soon.`
                    }
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAlertDetail(null);
                      handleAlertClick(showAlertDetail);
                    }}
                  >
                    View {showAlertDetail.entity_type === 'vehicle' ? 'Vehicle' : 'Driver'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAlertDetail(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlertCenter;
