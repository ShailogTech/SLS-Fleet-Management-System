import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Building, Save } from 'lucide-react';

const PLANT_TYPES = ['HPCL', 'IOCL', 'BPCL'];

const PlantForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inchargeUsers, setInchargeUsers] = useState([]);
  const [formData, setFormData] = useState({
    plant_name: '',
    plant_type: '',
    city: '',
    state: '',
    contact_phone: '',
    contact_email: '',
    plant_incharge_id: '',
  });

  useEffect(() => {
    const fetchInchargeUsers = async () => {
      try {
        const res = await api.get('/users');
        const available = res.data.filter(
          u => u.role === 'plant_incharge' && u.status === 'active'
        );
        setInchargeUsers(available);
      } catch { /* ignore */ }
    };
    fetchInchargeUsers();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.plant_name || !formData.plant_type || !formData.city || !formData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.contact_phone) delete payload.contact_phone;
      if (!payload.contact_email) delete payload.contact_email;
      if (!payload.plant_incharge_id) delete payload.plant_incharge_id;

      await api.post('/plants', payload);
      toast.success('Plant created successfully');
      navigate('/plants');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create plant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/plants')} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Add New Plant
          </h1>
          <p className="text-slate-600 mt-1">Register a new plant location</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Building className="h-5 w-5 mr-2 text-blue-600" />
              Plant Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plant_name">Plant Name *</Label>
                <Input
                  id="plant_name"
                  value={formData.plant_name}
                  onChange={(e) => handleChange('plant_name', e.target.value)}
                  placeholder="Enter plant name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plant_type">Plant Type *</Label>
                <select
                  id="plant_type"
                  value={formData.plant_type}
                  onChange={(e) => handleChange('plant_type', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select type</option>
                  {PLANT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Enter state"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plant_incharge_id">Plant Incharge</Label>
                <select
                  id="plant_incharge_id"
                  value={formData.plant_incharge_id}
                  onChange={(e) => handleChange('plant_incharge_id', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select plant incharge</option>
                  {inchargeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/plants')}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Plant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default PlantForm;
