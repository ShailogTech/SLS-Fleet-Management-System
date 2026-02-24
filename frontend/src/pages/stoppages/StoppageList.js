import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Plus, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';

const StoppageList = () => {
  const { user } = useAuth();
  const { registerRefresh } = useRefresh();
  const [stoppages, setStoppages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchStoppages = useCallback(async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const response = await api.get('/stoppages', { params });
      setStoppages(response.data);
    } catch (error) {
      toast.error('Failed to load stoppages');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchStoppages();
    fetchAnalytics();
  }, [fetchStoppages]);

  useEffect(() => { registerRefresh(fetchStoppages); }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/stoppages/analytics/summary');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics');
    }
  };

  const canCreate = ['plant_incharge', 'office_incharge', 'admin', 'superuser'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stoppage-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Vehicle Stoppages
          </h1>
          <p className="text-slate-600 mt-1">Track and manage vehicle downtime</p>
        </div>
        {canCreate && (
          <Link to="/stoppages/new">
            <Button className="bg-slate-900 hover:bg-slate-800" data-testid="add-stoppage-btn">
              <Plus className="h-4 w-4 mr-2" />
              Report Stoppage
            </Button>
          </Link>
        )}
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Stoppages</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{analytics.total_stoppages}</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Currently Stopped</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{analytics.active_stoppages}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Resumed</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">{analytics.resumed}</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-3">By Reason</p>
                <div className="space-y-2">
                  {analytics.by_reason.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate">{item._id}</span>
                      <span className="font-semibold text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stoppage Records</CardTitle>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === 'stopped' ? 'default' : 'outline'}
                onClick={() => setFilter('stopped')}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={filter === 'resumed' ? 'default' : 'outline'}
                onClick={() => setFilter('resumed')}
              >
                Resumed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stoppages.map((stoppage) => (
              <div
                key={stoppage.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                data-testid={`stoppage-item-${stoppage.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-bold text-slate-900">
                        {stoppage.vehicle_info?.vehicle_no}
                      </h3>
                      <StatusBadge status={stoppage.status} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Stoppage Date:</span>
                        <p className="font-medium text-slate-900">{stoppage.stoppage_date}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Reason:</span>
                        <p className="font-medium text-slate-900">{stoppage.reason}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Plant:</span>
                        <p className="font-medium text-slate-900">{stoppage.vehicle_info?.plant}</p>
                      </div>
                      {stoppage.days_stopped && (
                        <div>
                          <span className="text-slate-500">Days Stopped:</span>
                          <p className="font-semibold text-red-600">{stoppage.days_stopped} days</p>
                        </div>
                      )}
                    </div>
                    {stoppage.remarks && (
                      <p className="text-sm text-slate-600 mt-2">
                        <span className="font-medium">Remarks:</span> {stoppage.remarks}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {stoppages.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No stoppages found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoppageList;
