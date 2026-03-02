import React, { useEffect, useState } from 'react';
import { useRefresh } from '../../contexts/RefreshContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BarChart3, FileText, Download, TrendingUp, Truck, Users, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';

const Reports = () => {
  const { registerRefresh } = useRefresh();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => { registerRefresh(fetchStats); }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    toast.success('Report generation will be available in a future update');
  };

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Reports & Analytics
          </h1>
          <p className="text-slate-600 mt-1">Generate and view fleet performance reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]" data-testid="report-type-select">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Fleet Summary</SelectItem>
              <SelectItem value="vehicles">Vehicle Report</SelectItem>
              <SelectItem value="drivers">Driver Report</SelectItem>
              <SelectItem value="documents">Document Status</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport} className="bg-slate-900 hover:bg-slate-800" data-testid="generate-report-btn">
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Vehicles</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_vehicles || 0}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {stats?.active_vehicles || 0} active
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Drivers</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_drivers || 0}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {stats?.active_drivers || 0} active
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Tenders</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.active_tenders || 0}</p>
                <p className="text-xs text-slate-500 mt-1">
                  of {stats?.total_tenders || 0} total
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expiring Documents</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.expiring_documents || 0}</p>
                <p className="text-xs text-amber-600 mt-1">
                  next 30 days
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer" data-testid="fleet-summary-card">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Fleet Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Overview of fleet status, utilization, and performance metrics.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Vehicles</span>
                <span className="font-medium">{stats?.total_vehicles || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active</span>
                <span className="font-medium text-emerald-600">{stats?.active_vehicles || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending Approval</span>
                <span className="font-medium text-amber-600">{stats?.pending_vehicles || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer" data-testid="document-status-card">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Document Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Track document expiries, renewals, and compliance status.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Expiring Soon</span>
                <span className="font-medium text-amber-600">{stats?.expiring_documents || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending Approvals</span>
                <span className="font-medium">{stats?.pending_approvals || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer" data-testid="contract-report-card">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Contract Report</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              View tender and contract status with vehicle assignments.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Tenders</span>
                <span className="font-medium text-emerald-600">{stats?.active_tenders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Tenders</span>
                <span className="font-medium">{stats?.total_tenders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-400" />
          <h3 className="font-semibold text-slate-900 mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-sm text-slate-600">
            Detailed charts, exportable reports, and custom date range filtering will be available in future updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
