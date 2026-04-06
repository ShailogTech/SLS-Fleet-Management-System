import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, CheckCircle, Upload, FileText, X,
  User, ClipboardCheck, Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const REQUIRED_DOCUMENTS = [
  { key: 'dl', label: 'Driving License (DL)', required: true },
  { key: 'hazardous', label: 'Hazardous Certificate', required: true },
  { key: 'medical', label: 'Medical Fitness Certificate', required: true },
];

const STEPS = [
  { id: 1, title: 'Driver Details', icon: User },
  { id: 2, title: 'Upload Documents', icon: Upload },
  { id: 3, title: 'Review & Submit', icon: ClipboardCheck },
];

const DriverForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdDriverId, setCreatedDriverId] = useState(null);

  // Pre-fill from query params (e.g., from signup request approval)
  const [formData, setFormData] = useState({
    name: searchParams.get('name') || '',
    emp_id: '',
    phone: searchParams.get('phone') || '',
    dl_no: '',
    dl_expiry: '', hazardous_cert_expiry: '', plant: '',
  });

  const [plants, setPlants] = useState([]);
  const [docFiles, setDocFiles] = useState({});

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await api.get('/plants');
        setPlants(res.data);
      } catch (err) {
        console.error('Failed to fetch plants:', err);
      }
    };
    fetchPlants();
  }, []);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate emp_id from first 2 letters of name + last 4 digits of DL
      if (field === 'name' || field === 'dl_no') {
        const name = field === 'name' ? value : prev.name;
        const dl = field === 'dl_no' ? value : prev.dl_no;
        const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
        const dlSuffix = dl.replace(/[^0-9]/g, '').slice(-4);
        updated.emp_id = namePrefix && dlSuffix.length === 4 ? `${namePrefix}${dlSuffix}` : '';
      }
      return updated;
    });
  };

  const handleDocFileSelect = (docKey, file) => {
    setDocFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], file } }));
  };

  const handleDocExpiryChange = (docKey, expiry) => {
    setDocFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], expiry } }));
    if (docKey === 'dl') handleChange('dl_expiry', expiry);
    if (docKey === 'hazardous') handleChange('hazardous_cert_expiry', expiry);
  };

  const removeDocFile = (docKey) => {
    setDocFiles(prev => {
      const updated = { ...prev };
      if (updated[docKey]) updated[docKey] = { ...updated[docKey], file: null };
      return updated;
    });
  };

  const isStep1Valid = formData.name && formData.phone && formData.dl_no;

  // Step 2: All driver docs are mandatory — require both file and expiry
  const allRequiredDocsUploaded = REQUIRED_DOCUMENTS.filter(d => d.required).every(
    d => docFiles[d.key]?.file && docFiles[d.key]?.expiry
  );

  const handleSaveDriver = async () => {
    setLoading(true);
    try {
      const cleanedData = { ...formData };
      ['dl_expiry', 'hazardous_cert_expiry', 'plant'].forEach(field => {
        if (cleanedData[field] === '') cleanedData[field] = null;
      });

      const response = await api.post('/drivers', cleanedData);
      const driverId = response.data.id;
      setCreatedDriverId(driverId);
      toast.success('Driver details saved!');
      return driverId;
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        toast.error(errorDetail.map(e => e.msg || 'Validation error').join(', '));
      } else if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else {
        toast.error('Failed to save driver');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocuments = async (driverId) => {
    const dId = driverId || createdDriverId;
    if (!dId) return;

    for (const doc of REQUIRED_DOCUMENTS) {
      const docData = docFiles[doc.key];
      if (!docData?.file && !docData?.expiry) continue;
      if (uploadedDocs[doc.key]) continue; // Already uploaded, skip

      setUploadingDoc(doc.key);
      try {
        // Step 1: Save metadata as JSON (avoids multipart issues)
        const meta = { entity_type: 'driver', entity_id: dId, document_type: doc.key };
        if (docData.expiry) meta.expiry_date = docData.expiry;
        const metaRes = await api.post('/documents/save-metadata', meta);
        const docId = metaRes.data?.document?.id;

        // Step 2: If file present, attach it separately
        if (docData.file && docId) {
          const fileName = `${formData.emp_id}_${doc.key}`;
          const ext = docData.file.name.split('.').pop();
          const renamedFile = new File([docData.file], `${fileName}.${ext}`, { type: docData.file.type });
          const fileFd = new FormData();
          fileFd.append('file', renamedFile);
          try {
            await api.post(`/documents/${docId}/attach`, fileFd);
          } catch (fileErr) {
            console.error(`File attach failed for ${doc.label}, metadata saved:`, fileErr);
          }
        }
        setUploadedDocs(prev => ({ ...prev, [doc.key]: true }));
      } catch (error) {
        console.error(`Upload error for ${doc.label}:`, error);
      }
      setUploadingDoc(null);
    }

    // Verify saved documents from backend
    try {
      const res = await api.get(`/documents/driver/${dId}`);
      if (res.data?.length > 0) {
        const verified = {};
        res.data.forEach(d => { if (d.document_type) verified[d.document_type] = true; });
        setUploadedDocs(prev => ({ ...prev, ...verified }));
      }
    } catch (e) { /* ignore */ }
  };

  const handleGoToStep2 = () => {
    if (!isStep1Valid) {
      toast.error('Please fill all required driver details');
      return;
    }
    setCurrentStep(2);
  };

  const handleGoToStep3 = () => {
    if (!allRequiredDocsUploaded) {
      toast.error('Please upload all required documents with expiry dates');
      return;
    }
    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Step 1: Create driver in DB
      const driverId = await handleSaveDriver();
      if (!driverId) {
        setSubmitting(false);
        return;
      }
      // Step 2: Upload all documents
      await handleUploadDocuments(driverId);

      // Step 3: If from signup request, approve it now
      const signupRequestId = searchParams.get('signup_request_id');
      if (signupRequestId) {
        try {
          await api.post(`/auth/signup-requests/${signupRequestId}/approve?role=driver`);
          toast.success('Driver created and signup request approved!');
          navigate('/drivers');
        } catch (err) {
          console.error('Failed to approve signup request:', err);
          toast.error('Driver created but signup approval failed. Please approve manually in Signup Requests.');
          navigate('/signup-requests');
        }
        return;
      }

      // Step 4: Navigate
      if (isAdmin) {
        toast.success('Driver added successfully!');
        navigate('/drivers');
      } else {
        toast.success('Driver submitted for approval! Track status in My Submissions.');
        navigate('/my-submissions');
      }
    } catch (error) {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="driver-form-page">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/drivers')} data-testid="back-btn">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Add New Driver
        </h1>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center space-x-4">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && <div className={`h-0.5 w-16 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              <div className="flex flex-col items-center" data-testid={`step-${step.id}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted ? 'bg-emerald-100 text-emerald-600' :
                  isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                </div>
                <p className={`text-xs mt-1 font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                  {step.title}
                </p>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1 */}
      {currentStep === 1 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Driver Information</CardTitle>
            {searchParams.get('name') && (
              <p className="text-sm text-blue-600 mt-1">Pre-filled from signup request. Complete the remaining details.</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label>Full Name *</Label>
                <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} data-testid="driver-name-input" />
              </div>
              <div>
                <Label>Employee ID (auto-generated)</Label>
                <Input value={formData.emp_id} readOnly className="bg-slate-50" placeholder="Auto: first 2 letters of name + last 4 digits of DL" data-testid="driver-empid-input" />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} data-testid="driver-phone-input" />
              </div>
              <div>
                <Label>DL Number *</Label>
                <Input value={formData.dl_no} onChange={e => handleChange('dl_no', e.target.value)} placeholder="e.g., KA0120180000000" data-testid="driver-dlno-input" />
              </div>
              <div>
                <Label>Plant</Label>
                <select
                  value={formData.plant}
                  onChange={e => handleChange('plant', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  data-testid="driver-plant-input"
                >
                  <option value="">Select Plant</option>
                  {plants.map(p => (
                    <option key={p.id || p.plant_name} value={p.plant_name}>{p.plant_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
              <Button onClick={handleGoToStep2} disabled={!isStep1Valid} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-btn">
                Next: Upload Documents
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center"><Upload className="h-5 w-5 mr-2" /> Upload Driver Documents</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Upload documents for {formData.name} ({formData.emp_id}). Files will be named as {formData.emp_id}_documenttype.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {REQUIRED_DOCUMENTS.map(doc => (
                <DocumentRow
                  key={doc.key}
                  doc={doc}
                  entityRef={formData.emp_id}
                  fileData={docFiles[doc.key]}
                  isUploaded={!!uploadedDocs[doc.key]}
                  isUploading={uploadingDoc === doc.key}
                  onFileSelect={(file) => handleDocFileSelect(doc.key, file)}
                  onExpiryChange={(expiry) => handleDocExpiryChange(doc.key, expiry)}
                  onRemoveFile={() => removeDocFile(doc.key)}
                />
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="prev-step-btn">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button onClick={handleGoToStep3} disabled={submitting || !allRequiredDocsUploaded} className="bg-slate-900 hover:bg-slate-800" data-testid="upload-and-review-btn">
              {submitting ? 'Uploading...' : 'Upload & Review'} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center"><Eye className="h-5 w-5 mr-2" /> Review Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Driver Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['Name', formData.name],
                    ['Employee ID', formData.emp_id],
                    ['Phone', formData.phone],
                    ['DL Number', formData.dl_no],
                    ['Plant', formData.plant || 'N/A'],
                  ].map(([label, val]) => (
                    <div key={label} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="font-medium text-slate-900">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Uploaded Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {REQUIRED_DOCUMENTS.map(doc => {
                    const isUp = uploadedDocs[doc.key];
                    const hasExpiry = docFiles[doc.key]?.expiry;
                    const hasFile = docFiles[doc.key]?.file;
                    return (
                      <div key={doc.key} className={`flex items-center justify-between p-3 rounded-lg border ${isUp ? 'bg-emerald-50 border-emerald-200' : hasExpiry ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center space-x-2">
                          {isUp ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <FileText className="h-4 w-4 text-slate-400" />}
                          <span className="text-sm font-medium text-slate-700">{doc.label}</span>
                        </div>
                        <span className={`text-xs font-medium ${isUp ? 'text-emerald-600' : hasFile ? 'text-amber-600' : hasExpiry ? 'text-amber-600' : 'text-slate-400'}`}>
                          {isUp ? 'Uploaded' : hasFile ? 'Pending' : hasExpiry ? 'Metadata Only' : 'Not Added'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <p className="text-sm text-emerald-800">
                {isAdmin
                  ? 'Driver has been saved and documents uploaded. The driver is now active.'
                  : 'Driver has been saved and documents uploaded. The application is now in the approval queue. A Checker will review it first, then an Approver will give final approval.'}
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="prev-step-btn">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
            </Button>
            <Button onClick={handleFinalSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="final-submit-btn">
              <CheckCircle className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : 'Done - Track in My Submissions'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


const DocumentRow = ({ doc, entityRef, fileData, isUploaded, isUploading, onFileSelect, onExpiryChange, onRemoveFile }) => {
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
    <div className={`p-4 rounded-lg border transition-colors ${isUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`} data-testid={`doc-row-${doc.key}`}>
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
          <Input type="date" value={fileData?.expiry || ''} onChange={e => onExpiryChange(e.target.value)} className="mt-1" data-testid={`doc-expiry-${doc.key}`} />
        </div>
        <div>
          <Label className="text-xs">File ({entityRef}_{doc.key})</Label>
          {!fileName ? (
            <div {...getRootProps()} className={`mt-1 border border-dashed rounded-md p-3 text-center cursor-pointer text-xs ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`} data-testid={`doc-dropzone-${doc.key}`}>
              <input {...getInputProps()} />
              <Upload className="h-4 w-4 mx-auto text-slate-400 mb-1" />
              <span className="text-slate-500">Drop file or click (PDF, JPG, PNG, max 25MB)</span>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-xs text-slate-700 truncate flex-1">{fileName}</span>
              <button type="button" onClick={onRemoveFile} className="ml-2 text-red-500 hover:text-red-700" data-testid={`doc-remove-${doc.key}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverForm;
