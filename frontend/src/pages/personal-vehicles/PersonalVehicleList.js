import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../../utils/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  Car, Plus, Trash2, RefreshCw, X, Search,
  Upload, Eye, FileText, ChevronRight, ChevronLeft, Check, Download,
  CheckCircle
} from 'lucide-react';

const REQUIRED_DOCUMENTS = [
  { key: 'rc', label: 'Registration Certificate (RC)', required: true },
  { key: 'insurance', label: 'Insurance', required: true },
  { key: 'fitness', label: 'Fitness Certificate (FC)', required: true },
  { key: 'tax', label: 'Tax Receipt', required: true },
  { key: 'puc', label: 'PUC Certificate', required: true },
];

const PersonalVehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(null);

  // View modal
  const [viewVehicle, setViewVehicle] = useState(null);
  const [viewDocs, setViewDocs] = useState([]);
  const [viewDocsLoading, setViewDocsLoading] = useState(false);

  // Multi-step modal
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdVehicleId, setCreatedVehicleId] = useState(null);

  // Step 1: Vehicle details
  const [form, setForm] = useState({
    vehicle_no: '', owner_name: '', make: '', model: '', color: '',
    fuel_type: '', year: '', insurance_expiry: '', rc_expiry: '', notes: ''
  });

  // Step 2: Documents - { rc: { file, expiry }, insurance: { file, expiry }, ... }
  const [docFiles, setDocFiles] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({});

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/personal-vehicles');
      setVehicles(res.data);
    } catch (error) {
      toast.error('Failed to load personal vehicles');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setStep(1);
    setForm({ vehicle_no: '', owner_name: '', make: '', model: '', color: '', fuel_type: '', year: '', insurance_expiry: '', rc_expiry: '', notes: '' });
    setDocFiles({});
    setUploadedDocs({});
    setCreatedVehicleId(null);
    setUploadingDoc(null);
  };

  const handleDocFileSelect = (docKey, file) => {
    setDocFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], file } }));
  };

  const handleDocExpiryChange = (docKey, expiry) => {
    setDocFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], expiry } }));
  };

  const removeDocFile = (docKey) => {
    setDocFiles(prev => {
      const updated = { ...prev };
      if (updated[docKey]) updated[docKey] = { ...updated[docKey], file: null };
      return updated;
    });
  };

  // Step 1: Save vehicle details
  const handleSaveDetails = async () => {
    if (!form.vehicle_no.trim() || !form.owner_name.trim()) {
      toast.error('Vehicle number and owner name are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.year) payload.year = parseInt(payload.year);
      else delete payload.year;
      if (!payload.insurance_expiry) delete payload.insurance_expiry;
      if (!payload.rc_expiry) delete payload.rc_expiry;
      if (!payload.notes) delete payload.notes;

      const res = await api.post('/personal-vehicles', payload);
      setCreatedVehicleId(res.data.id);
      toast.success('Vehicle details saved');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save vehicle details');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Upload all documents
  const handleUploadDocuments = async () => {
    if (!createdVehicleId) return;
    setSubmitting(true);

    for (const doc of REQUIRED_DOCUMENTS) {
      const docData = docFiles[doc.key];
      if (!docData?.file && !docData?.expiry) continue;
      if (uploadedDocs[doc.key]) continue;

      setUploadingDoc(doc.key);
      try {
        const meta = { entity_type: 'personal_vehicle', entity_id: createdVehicleId, document_type: doc.key };
        if (docData.expiry) meta.expiry_date = docData.expiry;
        const metaRes = await api.post('/documents/save-metadata', meta);
        const docId = metaRes.data?.document?.id;

        if (docData.file && docId) {
          const ext = docData.file.name.split('.').pop();
          const renamedFile = new File([docData.file], `${form.vehicle_no}_${doc.key}.${ext}`, { type: docData.file.type });
          const fileFd = new FormData();
          fileFd.append('file', renamedFile);
          try {
            await api.post(`/documents/${docId}/attach`, fileFd);
          } catch (fileErr) {
            console.error(`File attach failed for ${doc.label}:`, fileErr);
          }
        }
        setUploadedDocs(prev => ({ ...prev, [doc.key]: true }));
      } catch (error) {
        console.error(`Upload error for ${doc.label}:`, error);
      }
      setUploadingDoc(null);
    }

    setSubmitting(false);
    setStep(3);
  };

  // Step 3: Final submit
  const handleFinalSubmit = () => {
    toast.success('Personal vehicle added successfully!');
    resetModal();
    fetchVehicles();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/personal-vehicles/${id}`);
      toast.success('Car removed');
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleView = async (vehicle) => {
    setViewVehicle(vehicle);
    setViewDocs([]);
    setViewDocsLoading(true);
    try {
      const res = await api.get(`/documents/personal_vehicle/${vehicle.id}`);
      setViewDocs(res.data || []);
    } catch (error) {
      // No docs found is fine
      setViewDocs([]);
    } finally {
      setViewDocsLoading(false);
    }
  };

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  const filtered = vehicles.filter(v =>
    v.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="personal-vehicles-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Personal Vehicles
          </h1>
          <p className="text-slate-600 mt-1">Manage personal cars</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={fetchVehicles}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Car
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Cars</p>
            {loading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-slate-900">{vehicles.length}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Unique Owners</p>
            {loading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-blue-600">{new Set(vehicles.map(v => v.owner_name)).size}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Makes</p>
            {loading ? <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold text-emerald-600">{new Set(vehicles.filter(v => v.make).map(v => v.make)).size}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by vehicle no, owner, make, model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && [1, 2, 3].map(i => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
        {!loading && filtered.map((vehicle) => (
          <Card key={vehicle.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Car className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{vehicle.vehicle_no}</h3>
                    <p className="text-sm text-slate-500">{vehicle.owner_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleView(vehicle)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(vehicle.id)}
                    disabled={deleting === vehicle.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {vehicle.make && <div><span className="text-slate-500">Make</span><p className="font-medium text-slate-900">{vehicle.make}</p></div>}
                {vehicle.model && <div><span className="text-slate-500">Model</span><p className="font-medium text-slate-900">{vehicle.model}</p></div>}
                {vehicle.color && <div><span className="text-slate-500">Color</span><p className="font-medium text-slate-900">{vehicle.color}</p></div>}
                {vehicle.fuel_type && <div><span className="text-slate-500">Fuel</span><p className="font-medium text-slate-900">{vehicle.fuel_type}</p></div>}
                {vehicle.year && <div><span className="text-slate-500">Year</span><p className="font-medium text-slate-900">{vehicle.year}</p></div>}
                {vehicle.insurance_expiry && <div><span className="text-slate-500">Insurance</span><p className="font-medium text-slate-900">{vehicle.insurance_expiry}</p></div>}
              </div>
              {vehicle.notes && (
                <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">{vehicle.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Car className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No personal cars found</p>
          <p className="text-sm mt-1">{vehicles.length === 0 ? 'Add your first car' : 'Try adjusting your search'}</p>
        </div>
      )}

      {/* ==================== VIEW MODAL ==================== */}
      {viewVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewVehicle(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Car className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{viewVehicle.vehicle_no}</h2>
                  <p className="text-sm text-slate-500">{viewVehicle.owner_name}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewVehicle(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              {/* Vehicle Details */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Vehicle Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {viewVehicle.make && <div><span className="text-slate-500">Make</span><p className="font-medium text-slate-900">{viewVehicle.make}</p></div>}
                  {viewVehicle.model && <div><span className="text-slate-500">Model</span><p className="font-medium text-slate-900">{viewVehicle.model}</p></div>}
                  {viewVehicle.color && <div><span className="text-slate-500">Color</span><p className="font-medium text-slate-900">{viewVehicle.color}</p></div>}
                  {viewVehicle.fuel_type && <div><span className="text-slate-500">Fuel Type</span><p className="font-medium text-slate-900">{viewVehicle.fuel_type}</p></div>}
                  {viewVehicle.year && <div><span className="text-slate-500">Year</span><p className="font-medium text-slate-900">{viewVehicle.year}</p></div>}
                  {viewVehicle.insurance_expiry && <div><span className="text-slate-500">Insurance Expiry</span><p className="font-medium text-slate-900">{viewVehicle.insurance_expiry}</p></div>}
                  {viewVehicle.rc_expiry && <div><span className="text-slate-500">RC Expiry</span><p className="font-medium text-slate-900">{viewVehicle.rc_expiry}</p></div>}
                </div>
                {viewVehicle.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-slate-500 text-sm">Notes</span>
                    <p className="text-sm text-slate-900">{viewVehicle.notes}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Documents</h3>
                {viewDocsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : viewDocs.length > 0 ? (
                  <div className="space-y-2">
                    {viewDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 capitalize">{doc.document_type?.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-500">
                              {doc.filename || 'No file'}
                              {doc.expiry_date ? ` | Expires: ${doc.expiry_date}` : ''}
                            </p>
                          </div>
                        </div>
                        {doc.file_url && (
                          <div className="flex items-center gap-1">
                            <a
                              href={`${backendUrl}${doc.file_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                            <a
                              href={`${backendUrl}${doc.file_url}`}
                              download
                              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-sm text-slate-400">
                    <FileText className="h-6 w-6 mx-auto mb-1" />
                    No documents uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MULTI-STEP MODAL ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={resetModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">

            {/* Stepper Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900">Add Personal Car</h2>
                <Button variant="ghost" size="sm" onClick={resetModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                {[
                  { num: 1, label: 'Vehicle Details' },
                  { num: 2, label: 'Upload Documents' },
                  { num: 3, label: 'Review & Submit' },
                ].map((s, i) => (
                  <React.Fragment key={s.num}>
                    {i > 0 && <div className={`flex-1 h-0.5 ${step > s.num - 1 ? 'bg-slate-900' : 'bg-slate-200'}`} />}
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        step > s.num ? 'bg-slate-900 text-white' :
                        step === s.num ? 'bg-slate-900 text-white' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                      </div>
                      <span className={`text-xs font-medium hidden sm:inline ${step >= s.num ? 'text-slate-900' : 'text-slate-400'}`}>
                        {s.label}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="p-6">

              {/* ========== STEP 1: VEHICLE DETAILS ========== */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vehicle Number *</Label>
                      <Input value={form.vehicle_no} onChange={(e) => setForm(p => ({ ...p, vehicle_no: e.target.value }))} placeholder="e.g., KA01AB1234" className="mt-1" />
                    </div>
                    <div>
                      <Label>Owner Name *</Label>
                      <Input value={form.owner_name} onChange={(e) => setForm(p => ({ ...p, owner_name: e.target.value }))} placeholder="Enter owner name" className="mt-1" />
                    </div>
                    <div>
                      <Label>Make</Label>
                      <Input value={form.make} onChange={(e) => setForm(p => ({ ...p, make: e.target.value }))} placeholder="e.g., Toyota, Honda" className="mt-1" />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Input value={form.model} onChange={(e) => setForm(p => ({ ...p, model: e.target.value }))} placeholder="e.g., Innova, City" className="mt-1" />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Input value={form.color} onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))} placeholder="e.g., White, Black" className="mt-1" />
                    </div>
                    <div>
                      <Label>Fuel Type</Label>
                      <Select value={form.fuel_type} onValueChange={(val) => setForm(p => ({ ...p, fuel_type: val }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Petrol">Petrol</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="CNG">CNG</SelectItem>
                          <SelectItem value="Electric">Electric</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input type="number" value={form.year} onChange={(e) => setForm(p => ({ ...p, year: e.target.value }))} placeholder="e.g., 2024" className="mt-1" />
                    </div>
                    <div>
                      <Label>Insurance Expiry</Label>
                      <Input type="date" value={form.insurance_expiry} onChange={(e) => setForm(p => ({ ...p, insurance_expiry: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>RC Expiry</Label>
                      <Input type="date" value={form.rc_expiry} onChange={(e) => setForm(p => ({ ...p, rc_expiry: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." className="mt-1" rows={2} />
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <Button variant="outline" className="flex-1" onClick={resetModal}>Cancel</Button>
                    <Button className="flex-1 bg-slate-900 hover:bg-slate-800" disabled={submitting} onClick={handleSaveDetails}>
                      {submitting ? 'Saving...' : 'Next: Upload Documents'}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ========== STEP 2: UPLOAD DOCUMENTS ========== */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Upload documents for <span className="font-semibold text-slate-900">{form.vehicle_no}</span>.
                    Files will be named as {form.vehicle_no}_documenttype.
                  </p>

                  <div className="space-y-4">
                    {REQUIRED_DOCUMENTS.map(doc => (
                      <DocumentRow
                        key={doc.key}
                        doc={doc}
                        vehicleNo={form.vehicle_no}
                        fileData={docFiles[doc.key]}
                        isUploaded={!!uploadedDocs[doc.key]}
                        isUploading={uploadingDoc === doc.key}
                        onFileSelect={(file) => handleDocFileSelect(doc.key, file)}
                        onExpiryChange={(expiry) => handleDocExpiryChange(doc.key, expiry)}
                        onRemoveFile={() => removeDocFile(doc.key)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Skip
                    </Button>
                    <div className="flex-1" />
                    <Button className="bg-slate-900 hover:bg-slate-800" disabled={submitting} onClick={handleUploadDocuments}>
                      {submitting ? 'Uploading...' : 'Upload & Review'}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ========== STEP 3: REVIEW & SUBMIT ========== */}
              {step === 3 && (
                <div className="space-y-5">
                  {/* Vehicle details review */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Vehicle Details</h3>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-500">Vehicle Number</span><p className="font-semibold text-slate-900">{form.vehicle_no}</p></div>
                        <div><span className="text-slate-500">Owner Name</span><p className="font-semibold text-slate-900">{form.owner_name}</p></div>
                        {form.make && <div><span className="text-slate-500">Make</span><p className="font-medium text-slate-900">{form.make}</p></div>}
                        {form.model && <div><span className="text-slate-500">Model</span><p className="font-medium text-slate-900">{form.model}</p></div>}
                        {form.color && <div><span className="text-slate-500">Color</span><p className="font-medium text-slate-900">{form.color}</p></div>}
                        {form.fuel_type && <div><span className="text-slate-500">Fuel Type</span><p className="font-medium text-slate-900">{form.fuel_type}</p></div>}
                        {form.year && <div><span className="text-slate-500">Year</span><p className="font-medium text-slate-900">{form.year}</p></div>}
                        {form.insurance_expiry && <div><span className="text-slate-500">Insurance Expiry</span><p className="font-medium text-slate-900">{form.insurance_expiry}</p></div>}
                        {form.rc_expiry && <div><span className="text-slate-500">RC Expiry</span><p className="font-medium text-slate-900">{form.rc_expiry}</p></div>}
                      </div>
                      {form.notes && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <span className="text-slate-500 text-sm">Notes</span>
                          <p className="text-sm text-slate-900">{form.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents review */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Uploaded Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {REQUIRED_DOCUMENTS.map(doc => {
                        const isUp = uploadedDocs[doc.key];
                        const hasExpiry = docFiles[doc.key]?.expiry;
                        const hasFile = docFiles[doc.key]?.file;
                        const fileUrl = isUp && createdVehicleId
                          ? `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/documents/personal_vehicle/${createdVehicleId}`
                          : null;
                        return (
                          <div key={doc.key} className={`flex items-center justify-between p-3 rounded-lg border ${
                            isUp ? 'bg-emerald-50 border-emerald-200' : hasExpiry ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center space-x-2">
                              {isUp ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <FileText className="h-4 w-4 text-slate-400" />}
                              <div>
                                <span className="text-sm font-medium text-slate-700">{doc.label}</span>
                                {hasExpiry && <p className="text-xs text-slate-500">Expiry: {docFiles[doc.key].expiry}</p>}
                              </div>
                            </div>
                            <span className={`text-xs font-medium ${isUp ? 'text-emerald-600' : hasFile ? 'text-amber-600' : 'text-slate-400'}`}>
                              {isUp ? 'Uploaded' : hasFile ? 'Pending' : hasExpiry ? 'Metadata Only' : 'Not Added'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back to Documents
                    </Button>
                    <div className="flex-1" />
                    <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleFinalSubmit}>
                      <Check className="h-4 w-4 mr-2" /> Submit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const DocumentRow = ({ doc, vehicleNo, fileData, isUploaded, isUploading, onFileSelect, onExpiryChange, onRemoveFile }) => {
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onFileSelect(accepted[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxSize: 26214400,
    multiple: false
  });

  const fileName = fileData?.file ? fileData.file.name : null;

  return (
    <div className={`p-4 rounded-lg border transition-colors ${isUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isUploaded ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <FileText className="h-4 w-4 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-800">{doc.label}</span>
          {doc.required && <span className="text-xs text-red-500">*</span>}
        </div>
        {isUploading && (
          <span className="text-xs text-blue-600 flex items-center">
            <span className="animate-spin h-3 w-3 border-2 border-blue-300 border-t-blue-600 rounded-full mr-1" />
            Uploading...
          </span>
        )}
        {isUploaded && <span className="text-xs text-emerald-600 font-medium">Uploaded</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Expiry Date {doc.required && '*'}</Label>
          <Input
            type="date"
            value={fileData?.expiry || ''}
            onChange={e => onExpiryChange(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">File ({vehicleNo}_{doc.key})</Label>
          {!fileName ? (
            <div
              {...getRootProps()}
              className={`mt-1 border border-dashed rounded-md p-3 text-center cursor-pointer text-xs ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-4 w-4 mx-auto text-slate-400 mb-1" />
              <span className="text-slate-500">Drop file or click (PDF, JPG, PNG, max 25MB)</span>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-xs text-slate-700 truncate flex-1">{fileName}</span>
              <button type="button" onClick={onRemoveFile} className="ml-2 text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalVehicleList;
