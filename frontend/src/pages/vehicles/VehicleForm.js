import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, CheckCircle, Upload, FileText, X, Truck,
  ClipboardCheck, Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const REQUIRED_DOCUMENTS = [
  { key: 'rc', label: 'Registration Certificate (RC)', required: true, dateLabel: 'Registration Date' },
  { key: 'insurance', label: 'Insurance', required: true },
  { key: 'fitness', label: 'Fitness Certificate (FC)', required: true },
  { key: 'tax', label: 'Tax Receipt', required: true },
  { key: 'puc', label: 'PUC Certificate', required: true },
  { key: 'permit', label: 'Permit', required: true },
  { key: 'national_permit', label: 'National Permit', required: true },
  { key: 'cll_addition', label: 'CLL Addition', required: false },
  { key: 'temp_permit', label: 'Temp Permit', required: false },
];

const CONCERN_OPTIONS = [
  'Taurus Carrier', 'Taurus Tanker', 'Commet Carrier', 'Commet Tanker',
  'Company', 'Personal', 'Service', 'Other'
];

const WHEELS_OPTIONS = ['2', '4', '8', '16'];

const STEPS = [
  { id: 1, title: 'Vehicle Details', icon: Truck },
  { id: 2, title: 'Upload Documents', icon: Upload },
  { id: 3, title: 'Review & Submit', icon: ClipboardCheck },
];

const VehicleForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superuser'].includes(user?.role);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdVehicleId, setCreatedVehicleId] = useState(null);

  const [plants, setPlants] = useState([]);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await api.get('/plants');
        setPlants(response.data || []);
      } catch (error) {
        console.error('Failed to fetch plants:', error);
      }
    };
    fetchPlants();
  }, []);

  const [formData, setFormData] = useState({
    vehicle_no: '', owner_name: '', concern: '', wheels: '', reg_date: '', make: '',
    chassis_no: '', engine_no: '', rto: '', plant: '', phone: '',
    vehicle_type: '',
    documents: {
      rc_expiry: '', insurance_expiry: '', fitness_expiry: '',
      tax_expiry: '', puc_expiry: '', permit_expiry: '', national_permit_expiry: '',
      cll_addition_expiry: '', temp_permit_expiry: ''
    }
  });

  const handleChange = (field, value) => {
    // Words only fields - no numbers allowed
    const wordsOnlyFields = ['owner_name', 'make', 'rto'];
    if (wordsOnlyFields.includes(field)) {
      if (/[0-9]/.test(value)) return;
    }
    // Phone - digits only, max 10
    if (field === 'phone') {
      if (/[^0-9]/.test(value)) return;
      if (value.length > 10) return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Document files state: { rc: { file, expiry }, insurance: { file, expiry }, ... }
  const [docFiles, setDocFiles] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({});

  const handleDocFileSelect = (docKey, file) => {
    setDocFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], file } }));
  };

  const handleDocExpiryChange = (docKey, expiry) => {
    setDocFiles(prev => ({ ...prev, [docKey]: { ...prev[docKey], expiry } }));
    // Also update document expiry in form data
    const expiryMap = {
      rc: 'rc_expiry', insurance: 'insurance_expiry', fitness: 'fitness_expiry',
      tax: 'tax_expiry', puc: 'puc_expiry', permit: 'permit_expiry',
      national_permit: 'national_permit_expiry',
      cll_addition: 'cll_addition_expiry', temp_permit: 'temp_permit_expiry'
    };
    if (expiryMap[docKey]) {
      setFormData(prev => ({
        ...prev,
        documents: { ...prev.documents, [expiryMap[docKey]]: expiry }
      }));
    }
  };

  const removeDocFile = (docKey) => {
    setDocFiles(prev => {
      const updated = { ...prev };
      if (updated[docKey]) updated[docKey] = { ...updated[docKey], file: null };
      return updated;
    });
  };

  // Step 1 validation
  const isPersonalType = formData.vehicle_type === 'Personal';
  const isStep1Valid = formData.vehicle_no && formData.owner_name && formData.make && (isPersonalType || formData.engine_no);

  // Step 2: Required docs must have both file and expiry
  const allRequiredDocsUploaded = REQUIRED_DOCUMENTS.filter(d => d.required).every(
    d => docFiles[d.key]?.file && docFiles[d.key]?.expiry
  );

  const handleSaveVehicle = async () => {
    setLoading(true);
    try {
      // Clean up formData - convert empty strings to null for date/optional fields
      const cleanedData = { ...formData };
      
      // Convert empty strings to null for top-level optional fields
      ['concern', 'wheels', 'reg_date', 'chassis_no', 'rto', 'plant', 'phone', 'vehicle_type'].forEach(field => {
        if (cleanedData[field] === '') cleanedData[field] = null;
      });
      
      // Convert empty strings to null for documents expiry fields
      if (cleanedData.documents) {
        const cleanedDocs = {};
        let hasValidDoc = false;
        Object.entries(cleanedData.documents).forEach(([key, value]) => {
          if (value && value !== '') {
            cleanedDocs[key] = value;
            hasValidDoc = true;
          } else {
            cleanedDocs[key] = null;
          }
        });
        cleanedData.documents = hasValidDoc ? cleanedDocs : null;
      }
      
      // Route to personal vehicles if vehicle type is Personal
      const isPersonal = cleanedData.vehicle_type === 'Personal';
      if (isPersonal) {
        const personalData = {
          vehicle_no: cleanedData.vehicle_no,
          owner_name: cleanedData.owner_name,
          make: cleanedData.make,
          insurance_expiry: cleanedData.documents?.insurance_expiry || null,
          rc_expiry: cleanedData.documents?.rc_expiry || null,
          notes: cleanedData.concern || null,
        };
        const response = await api.post('/personal-vehicles', personalData);
        const vehicleId = response.data.id;
        setCreatedVehicleId(vehicleId);
        toast.success('Personal vehicle saved!');
        return vehicleId;
      }

      const response = await api.post('/vehicles', cleanedData);
      const vehicleId = response.data.id;
      setCreatedVehicleId(vehicleId);
      toast.success('Vehicle details saved!');
      return vehicleId;
    } catch (error) {
      // Handle Pydantic validation errors (array of error objects)
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        const errorMsg = errorDetail.map(e => e.msg || 'Validation error').join(', ');
        toast.error(errorMsg);
      } else if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else {
        toast.error('Failed to save vehicle');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocuments = async (vehicleId) => {
    const vehId = vehicleId || createdVehicleId;
    if (!vehId) return;

    for (const doc of REQUIRED_DOCUMENTS) {
      const docData = docFiles[doc.key];
      if (!docData?.file && !docData?.expiry) continue;
      if (uploadedDocs[doc.key]) continue; // Already uploaded, skip

      setUploadingDoc(doc.key);
      try {
        // Step 1: Save metadata as JSON (avoids multipart issues)
        const entityType = formData.vehicle_type === 'Personal' ? 'personal_vehicle' : 'vehicle';
        const meta = { entity_type: entityType, entity_id: vehId, document_type: doc.key };
        if (docData.expiry) meta.expiry_date = docData.expiry;
        const metaRes = await api.post('/documents/save-metadata', meta);
        const docId = metaRes.data?.document?.id;

        // Step 2: If file present, attach it separately
        if (docData.file && docId) {
          const fileName = `${formData.vehicle_no}_${doc.key}`;
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
      const docEntityType = formData.vehicle_type === 'Personal' ? 'personal_vehicle' : 'vehicle';
      const res = await api.get(`/documents/${docEntityType}/${vehId}`);
      if (res.data?.length > 0) {
        const verified = {};
        res.data.forEach(d => { if (d.document_type) verified[d.document_type] = true; });
        setUploadedDocs(prev => ({ ...prev, ...verified }));
      }
    } catch (e) { /* ignore */ }
  };

  const handleGoToStep2 = async () => {
    if (!isStep1Valid) {
      toast.error('Please fill in required vehicle details');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const vehicleId = await handleSaveVehicle();
      if (vehicleId) {
        setCurrentStep(2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToStep3 = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await handleUploadDocuments();
      setCurrentStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    if (isPersonalType) {
      toast.success('Personal vehicle saved successfully!');
      navigate('/personal-vehicles');
    } else if (isAdmin) {
      toast.success('Vehicle added successfully!');
      navigate('/vehicles');
    } else {
      toast.success('Vehicle submitted for approval! Track status in My Submissions.');
      navigate('/my-submissions');
    }
  };

  return (
    <div className="space-y-6" data-testid="vehicle-form-page">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vehicles')} data-testid="back-btn">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Add New Vehicle
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
              {idx > 0 && (
                <div className={`h-0.5 w-16 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
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

      {/* Step 1: Vehicle Details */}
      {currentStep === 1 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label>Vehicle Number *</Label>
                <Input value={formData.vehicle_no} onChange={e => handleChange('vehicle_no', e.target.value)} placeholder="e.g., AP39TE0828" data-testid="vehicle-no-input" />
              </div>
              <div>
                <Label>Owner Name *</Label>
                <Input value={formData.owner_name} onChange={e => handleChange('owner_name', e.target.value)} data-testid="owner-name-input" />
              </div>
              <div>
                <Label>Make *</Label>
                <Input value={formData.make} onChange={e => handleChange('make', e.target.value)} placeholder="e.g., ASHOK LEYLAND" data-testid="make-input" />
              </div>
              <div>
                <Label>Concern</Label>
                <Input value={formData.concern} onChange={e => handleChange('concern', e.target.value)} placeholder="e.g., Company name" data-testid="concern-input" />
              </div>
              <div>
                <Label>Vehicle Type</Label>
                <Select value={formData.vehicle_type} onValueChange={val => handleChange('vehicle_type', val)} data-testid="vehicle-type-input">
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCERN_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Engine Number *</Label>
                <Input value={formData.engine_no} onChange={e => handleChange('engine_no', e.target.value)} placeholder="e.g., KCEZ419373" data-testid="engine-no-input" />
              </div>
              <div>
                <Label>Wheels</Label>
                <Select value={formData.wheels} onValueChange={val => handleChange('wheels', val)} data-testid="wheels-input">
                  <SelectTrigger>
                    <SelectValue placeholder="Select wheels" />
                  </SelectTrigger>
                  <SelectContent>
                    {WHEELS_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Registration Date</Label>
                <Input type="date" value={formData.reg_date} onChange={e => handleChange('reg_date', e.target.value)} data-testid="reg-date-input" />
              </div>
              <div>
                <Label>Chassis Number</Label>
                <Input value={formData.chassis_no} onChange={e => handleChange('chassis_no', e.target.value)} data-testid="chassis-no-input" />
              </div>
              <div>
                <Label>RTO</Label>
                <Input value={formData.rto} onChange={e => handleChange('rto', e.target.value)} data-testid="rto-input" />
              </div>
              <div>
                <Label>Plant</Label>
                <Select value={formData.plant} onValueChange={val => handleChange('plant', val)} data-testid="plant-input">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((p) => (
                      <SelectItem key={p.id} value={p.plant_name}>
                        {p.plant_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} inputMode="numeric" placeholder="10-digit number" data-testid="phone-input" />
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
              <Button onClick={handleGoToStep2} disabled={loading || submitting || !isStep1Valid} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-btn">
                {loading || submitting ? 'Saving...' : 'Save & Upload Documents'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Document Upload */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Upload Vehicle Documents
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Upload documents for {formData.vehicle_no}. Files will be named as {formData.vehicle_no}_documenttype.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {REQUIRED_DOCUMENTS.map(doc => (
                <DocumentRow
                  key={doc.key}
                  doc={doc}
                  vehicleNo={formData.vehicle_no}
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleGoToStep3} disabled={submitting || !allRequiredDocsUploaded} className="bg-slate-900 hover:bg-slate-800" data-testid="upload-and-review-btn">
              {submitting ? 'Uploading...' : 'Upload & Review'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Review Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Vehicle Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Vehicle Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      ['Vehicle No', formData.vehicle_no],
                      ['Engine No', formData.engine_no],
                      ['Owner', formData.owner_name],
                      ['Make', formData.make],
                      ['Concern', formData.concern || 'N/A'],
                      ['Vehicle Type', formData.vehicle_type || 'N/A'],
                      ['Wheels', formData.wheels || 'N/A'],
                      ['Plant', formData.plant || 'N/A'],
                      ['RTO', formData.rto || 'N/A'],
                    ].map(([label, val]) => (
                      <div key={label} className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="font-medium text-slate-900">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document Summary */}
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
                          <span className={`text-xs font-medium ${isUp ? 'text-emerald-600' : hasFile ? 'text-amber-600' : 'text-slate-400'}`}>
                            {isUp ? 'Uploaded' : hasFile ? 'Pending' : hasExpiry ? 'Metadata Only' : 'Not Added'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <p className="text-sm text-emerald-800">
                {isAdmin
                  ? 'Your vehicle has been saved and documents uploaded. The vehicle is now active.'
                  : 'Your vehicle has been saved and documents uploaded. The application is now in the approval queue. A Checker will review it first, then an Approver will give final approval.'}
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="prev-step-btn">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
            <Button onClick={handleFinalSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="final-submit-btn">
              <CheckCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting...' : 'Done - Track in My Submissions'}
            </Button>
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
    maxSize: 26214400, // 25MB
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
          <Label className="text-xs">{doc.dateLabel || 'Expiry Date'} {doc.required && '*'}</Label>
          <Input
            type="date"
            value={fileData?.expiry || ''}
            onChange={e => onExpiryChange(e.target.value)}
            className="mt-1"
            data-testid={`doc-expiry-${doc.key}`}
          />
        </div>

        <div>
          <Label className="text-xs">File ({vehicleNo}_{doc.key})</Label>
          {!fileName ? (
            <div
              {...getRootProps()}
              className={`mt-1 border border-dashed rounded-md p-3 text-center cursor-pointer text-xs ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
              data-testid={`doc-dropzone-${doc.key}`}
            >
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

export default VehicleForm;
