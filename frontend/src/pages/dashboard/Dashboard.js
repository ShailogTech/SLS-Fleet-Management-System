import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Truck, Users, FileText, CheckSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';

const Dashboard = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { registerRefresh(fetchDashboardData); }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/alerts')
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <TruckLoader />;
  }

  const metrics = [
    {
      title: 'Total Vehicles',
      value: stats?.total_vehicles || 0,
      icon: Truck,
    },
    {
      title: 'Active Drivers',
      value: stats?.active_drivers || 0,
      icon: Users,
    },
    {
      title: 'Active Tenders',
      value: stats?.active_tenders || 0,
      icon: FileText,
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_approvals || 0,
      icon: CheckSquare,
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-600 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          Here's what's happening with your fleet today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="dash-metric-card"
              data-testid={`metric-card-${metric.title.toLowerCase().replace(' ', '-')}`}
            >
              <div className="dash-metric-content">
                <div className="dash-metric-icon">
                  <Icon className="dash-metric-icon-svg" />
                </div>
                <p className="dash-metric-value">{metric.value}</p>
                <p className="dash-metric-title">{metric.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  data-testid={`alert-item-${index}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {alert.entity_name} - {alert.document_type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {alert.type === 'expired' ? 'Expired' : 'Expires Soon'}: {alert.expiry_date}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {alert.priority.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
