import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import {
  User, Camera, Save, Edit3, X, Shield, Mail, Phone,
  Building, AlertCircle, CheckCircle, Clock, Trash2, Upload, ImageOff
} from 'lucide-react';
import TruckLoader from '../../components/common/TruckLoader';

const UserProfile = () => {
  const { user: authUser, updateUser } = useAuth();
  const { registerRefresh } = useRefresh();
  const [profile, setProfile] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const fileInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    name: '', phone: '', emp_id: '', address: '', emergency_contact: ''
  });

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => { registerRefresh(fetchProfile); }, []);

  useEffect(() => { setImgLoaded(false); }, [profile?.photo_url]);

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
      updateUser({ photo_url: res.data.photo_url });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setRemoving(true);
    try {
      await api.delete('/users/profile/photo');
      toast.success('Profile photo removed!');
      setProfile(prev => ({ ...prev, photo_url: null }));
      updateUser({ photo_url: null });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove photo');
    } finally {
      setRemoving(false);
      setShowRemoveModal(false);
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
    return <TruckLoader />;
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="user-profile-page">
      <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
        My Profile
      </h1>

      {/* Photo + Name Card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-slate-800 to-slate-600" />
        <CardContent className="relative -mt-14 pb-6">
          <div className="flex items-end space-x-5">
            {/* Profile photo with hover overlay */}
            <div className="relative group" data-testid="profile-photo-section">
              <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg">
                {profile.photo_url ? (
                  <>
                    {!imgLoaded && (
                      <div className="w-full h-full animate-pulse bg-slate-300" />
                    )}
                    <img
                      src={`${backendUrl}${profile.photo_url}`}
                      alt={profile.name}
                      className={`w-full h-full object-cover ${imgLoaded ? '' : 'hidden'}`}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgLoaded(true)}
                      data-testid="profile-photo-img"
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-300">
                    <User className="h-12 w-12 text-slate-500" />
                  </div>
                )}
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || removing}
                    className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                    title="Upload photo"
                    data-testid="upload-photo-btn"
                  >
                    {uploading ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  {profile.photo_url && (
                    <button
                      onClick={() => setShowRemoveModal(true)}
                      disabled={removing || uploading}
                      className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-500/60 transition-colors"
                      title="Remove photo"
                      data-testid="remove-photo-btn"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                data-testid="photo-file-input"
              />
            </div>
            <div className="pb-2">
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <p className="text-sm text-slate-500 flex items-center mt-0.5">
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

      {/* Remove Photo Confirmation Modal — portal to body to avoid page-transition opacity override */}
      {showRemoveModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: 'profileModalFadeIn 0.2s ease-out' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !removing && setShowRemoveModal(false)}
            style={{ animation: 'profileModalFadeIn 0.2s ease-out' }}
          />
          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ animation: 'profileModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Red accent bar */}
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
            <div className="p-6 text-center">
              {/* Icon */}
              <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <ImageOff className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Remove Profile Photo</h3>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to remove your profile photo? This action cannot be undone.
              </p>
            </div>
            {/* Actions */}
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setShowRemoveModal(false)}
                disabled={removing}
                className="flex-1 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePhoto}
                disabled={removing}
                className="flex-1 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                data-testid="confirm-remove-photo-btn"
              >
                {removing ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-red-200 border-t-red-600 rounded-full" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                  <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, '') }))} maxLength={10} data-testid="edit-phone-input" />
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
