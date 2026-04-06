import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../../contexts/RefreshContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from 'sonner';
import TruckLoader from '../../components/common/TruckLoader';

const ALL_ROLES = [
  { value: 'admin', label: 'Admin', requiresSuperuser: true },
  { value: 'approver', label: 'Approver' },
  { value: 'checker', label: 'Checker' },
  { value: 'operational_manager', label: 'Operational Manager' },
  { value: 'accounts_manager', label: 'Accounts Manager' },
  { value: 'maker', label: 'Maker' },
  { value: 'office_incharge', label: 'Office Incharge' },
  { value: 'plant_incharge', label: 'Plant Incharge' },
  { value: 'records_incharge', label: 'Records Incharge' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'driver', label: 'Driver' },
];

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isSuperuser = currentUser?.role === 'superuser';
  const ROLES = ALL_ROLES.filter(r => !r.requiresSuperuser || isSuperuser);
  const { registerRefresh } = useRefresh();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    role: 'viewer',
    plant: '',
  });
  const [availablePlants, setAvailablePlants] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => { registerRefresh(fetchUsers); }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlants = async () => {
    try {
      const res = await api.get('/users/available-plants');
      setAvailablePlants(res.data.available || []);
    } catch (error) {
      console.log('Failed to load available plants');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If creating a new user with driver role, redirect to Add Driver page
    if (!editingUser && formData.role === 'driver') {
      setIsModalOpen(false);
      navigate('/drivers/new');
      return;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', formData);
        toast.success('User created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      password: '',
      plant: user.plant || '',
    });
    if (user.role === 'plant_incharge') fetchAvailablePlants();
    setIsModalOpen(true);
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.put(`/users/${userId}`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete "${user.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      phone: '',
      password: '',
      role: 'viewer',
      plant: '',
    });
    setEditingUser(null);
  };

  const openNewUserModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6" data-testid="user-management-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            User Management
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage system users and roles</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewUserModal} className="bg-slate-900 hover:bg-slate-800" data-testid="add-user-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="user-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                    data-testid="user-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    maxLength={10}
                    required
                    data-testid="user-phone-input"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => {
                    setFormData({ ...formData, role: value, plant: value !== 'plant_incharge' ? '' : formData.plant });
                    if (value === 'plant_incharge') fetchAvailablePlants();
                  }}>
                    <SelectTrigger data-testid="user-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'plant_incharge' && (
                  <div>
                    <Label htmlFor="plant">Assign Plant *</Label>
                    <Select value={formData.plant} onValueChange={(value) => setFormData({ ...formData, plant: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plant" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* If editing and user already has a plant, show it as an option */}
                        {editingUser?.plant && !availablePlants.includes(editingUser.plant) && (
                          <SelectItem key={editingUser.plant} value={editingUser.plant}>
                            {editingUser.plant} (current)
                          </SelectItem>
                        )}
                        {availablePlants.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                        {availablePlants.length === 0 && !editingUser?.plant && (
                          <SelectItem value="__none" disabled>
                            No plants available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!editingUser && (
                  <div className="col-span-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      data-testid="user-password-input"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-user-btn">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="user-search-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <div key={user.id} className="py-4 first:pt-0 last:pb-0" data-testid={`user-row-${user.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <StatusBadge status={user.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {ROLES.find(r => r.value === user.role)?.label || user.role}
                  </span>
                  {user.plant && <span className="text-xs text-slate-500">{user.plant}</span>}
                  <span className="text-xs text-slate-500">{user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleEdit(user)}>
                    <Edit2 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleStatusToggle(user.id, user.status)}>
                    {user.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(user)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Plant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50" data-testid={`user-row-desktop-${user.id}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{user.phone}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {ROLES.find(r => r.value === user.role)?.label || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{user.plant || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={user.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(user)} data-testid={`edit-user-${user.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleStatusToggle(user.id, user.status)} data-testid={`toggle-user-${user.id}`}>
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(user)} data-testid={`delete-user-${user.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
