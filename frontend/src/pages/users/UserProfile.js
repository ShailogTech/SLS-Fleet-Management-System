import React, { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import {
  User, Camera, Save, Edit3, X, Shield, Mail, Phone,
  Building, AlertCircle, CheckCircle, Clock
} from 'lucide-react';

const UserProfile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    name: '', phone: '', emp_id: '', address: '', emergency_contact: ''
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setProfile(res.data.profile);
      setPendingEdit(res.data.pending_edit);
      setEditForm({
        name: res.data.profile.name || '',
        phone: res.data.profile.phone || '',
        emp_id: res.data.profile.emp_id || '',
        address: res.data.profile.address || '',
        emergency_contact: res.data.profile.emergency_contact || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG or WEBP image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo must be under 10MB');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/users/profile/photo', fd);
      toast.success('Profile photo updated!');
      setProfile(prev => ({ ...prev, photo_url: res.data.photo_url }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitEdit = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', editForm);
      toast.success('Profile edit submitted for approval!');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit edit');
    } finally {
      setSaving(false);
    }
  };

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="user-profile-page">
      <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
        My Profile
      </h1>

      {/* Photo + Name Card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-600" />
        <CardContent className="relative -mt-12 pb-6">
          <div className="flex items-end space-x-5">
            <div className="relative" data-testid="profile-photo-section">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg">
                {profile.photo_url ? (
                  <img
                    src={`${backendUrl}${profile.photo_url}`}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    data-testid="profile-photo-img"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-300">
                    <User className="h-10 w-10 text-slate-500" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-colors shadow-md"
                data-testid="upload-photo-btn"
              >
                {uploading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                data-testid="photo-file-input"
              />
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <p className="text-sm text-slate-500 flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                <span className="capitalize">{profile.role?.replace('_', ' ')}</span>
                <span className="mx-2">|</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profile.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {profile.status}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Edit Notice */}
      {pendingEdit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center space-x-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Profile Edit Pending Approval</p>
              <p className="text-xs text-amber-600 mt-1">
                Changes requested: {Object.keys(pendingEdit.requested_data).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Details */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          {!editing && !pendingEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="edit-profile-btn">
              <Edit3 className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
          {editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} data-testid="cancel-edit-btn">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} data-testid="edit-name-input" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} data-testid="edit-phone-input" />
                </div>
                <div>
                  <Label>Employee ID</Label>
                  <Input value={editForm.emp_id} onChange={e => setEditForm(p => ({ ...p, emp_id: e.target.value }))} data-testid="edit-empid-input" />
                </div>
                <div>
                  <Label>Emergency Contact</Label>
                  <Input value={editForm.emergency_contact} onChange={e => setEditForm(p => ({ ...p, emergency_contact: e.target.value }))} data-testid="edit-emergency-input" />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} data-testid="edit-address-input" />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Profile changes will be submitted for approval. A Checker/Approver will review before applying.</span>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmitEdit} disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid="submit-edit-btn">
                  {saving ? 'Submitting...' : (
                    <><Save className="h-4 w-4 mr-2" /> Submit for Approval</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ProfileField icon={Mail} label="Email" value={profile.email} />
              <ProfileField icon={Phone} label="Phone" value={profile.phone} />
              <ProfileField icon={User} label="Employee ID" value={profile.emp_id || 'Not set'} />
              <ProfileField icon={Building} label="Address" value={profile.address || 'Not set'} />
              <ProfileField icon={Phone} label="Emergency Contact" value={profile.emergency_contact || 'Not set'} />
              <ProfileField icon={Shield} label="Role" value={profile.role?.replace('_', ' ')} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ProfileField = ({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg" data-testid={`profile-field-${label.toLowerCase().replace(/ /g, '-')}`}>
    <Icon className="h-5 w-5 text-slate-400 mt-0.5" />
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 capitalize">{value}</p>
    </div>
  </div>
);

export default UserProfile;
