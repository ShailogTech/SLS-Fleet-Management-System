import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, X, FileText, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = {
  vehicle: [
    { value: 'rc', label: 'RC (Form 23)' },
    { value: 'tax', label: 'Tax Receipt' },
    { value: 'fc', label: 'FC (Form 38)' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'puc', label: 'PUC' },
    { value: 'permit', label: 'Permit' },
    { value: 'national_permit', label: 'National Permit' },
    { value: 'cll', label: 'CLL' },
  ],
  driver: [
    { value: 'dl', label: 'Driving License' },
    { value: 'badge', label: 'Badge' },
    { value: 'medical', label: 'Medical Fitness' },
  ],
  contract: [
    { value: 'loi', label: 'LOI/LOA' },
    { value: 'sd', label: 'Security Deposit' },
    { value: 'bg', label: 'Bank Guarantee' },
  ]
};

const DocumentUpload = ({ entityType, entityId, entityName, onUploadComplete }) => {
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxSize: 26214400, // 25MB
    multiple: false
  });

  const resetForm = () => {
    setDocumentType('');
    setDocumentNumber('');
    setIssueDate('');
    setExpiryDate('');
    setIssuingAuthority('');
    setUploadedFile(null);
  };

  const handleSaveMetadataOnly = async () => {
    if (!documentType) {
      toast.error('Please select a document type');
      return;
    }
    setSavingMetadata(true);
    try {
      const formData = new FormData();
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      formData.append('document_type', documentType);
      if (documentNumber) formData.append('document_number', documentNumber);
      if (issueDate) formData.append('issue_date', issueDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (issuingAuthority) formData.append('issuing_authority', issuingAuthority);

      await api.post('/documents/metadata', formData);
      toast.success('Document details saved! You can upload the file later.');
      resetForm();
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save document details');
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleUploadWithMetadata = async (e) => {
    e.preventDefault();
    if (!uploadedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!documentType) {
      toast.error('Please select a document type');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      formData.append('document_type', documentType);
      if (documentNumber) formData.append('document_number', documentNumber);
      if (issueDate) formData.append('issue_date', issueDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (issuingAuthority) formData.append('issuing_authority', issuingAuthority);

      await api.post('/documents/upload', formData);
      toast.success('Document uploaded successfully!');
      resetForm();
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-slate-200" data-testid="document-upload-form">
      <CardContent className="pt-6">
        <form onSubmit={handleUploadWithMetadata} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Upload Document for {entityName}
            </h3>
            <p className="text-sm text-slate-500">Fill in document details, then upload the file or save details for later.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="documentType">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger data-testid="document-type-select">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES[entityType]?.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g., KA01 2022 8000000"
                data-testid="document-number-input"
              />
            </div>

            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                data-testid="issue-date-input"
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="expiry-date-input"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="issuingAuthority">Issuing Authority</Label>
              <Input
                id="issuingAuthority"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g., RTO Ananthapur"
                data-testid="issuing-authority-input"
              />
            </div>
          </div>

          <div>
            <Label>Upload File (optional - can be added later)</Label>
            <div
              {...getRootProps()}
              className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              data-testid="file-dropzone"
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Drop the file here...</p>
              ) : (
                <div>
                  <p className="text-slate-600 font-medium mb-1">
                    Drag & drop a file here, or click to select
                  </p>
                  <p className="text-sm text-slate-500">
                    Supported: PDF, JPG, PNG (Max 25MB)
                  </p>
                </div>
              )}
            </div>

            {uploadedFile && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-7 w-7 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-red-600 hover:text-red-700"
                  data-testid="remove-file-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveMetadataOnly}
              disabled={savingMetadata || !documentType}
              data-testid="save-metadata-btn"
            >
              {savingMetadata ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full mr-2" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Details Only
                </>
              )}
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800"
              disabled={uploading || !documentType || !uploadedFile}
              data-testid="upload-submit-btn"
            >
              {uploading ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                  Uploading...
                </span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
