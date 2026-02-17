import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Truck, Users, FileText, CheckSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Vehicles',
      value: stats?.total_vehicles || 0,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Drivers',
      value: stats?.active_drivers || 0,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Active Tenders',
      value: stats?.active_tenders || 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_approvals || 0,
      icon: CheckSquare,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
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
            <Card key={metric.title} className="border-slate-200" data-testid={`metric-card-${metric.title.toLowerCase().replace(' ', '-')}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{metric.value}</p>
                  </div>
                  <div className={`${metric.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
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
