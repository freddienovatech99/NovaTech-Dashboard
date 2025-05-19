import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Constants
const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Repaired", label: "Repaired" },
  { value: "Returned", label: "Returned" },
  { value: "Failed", label: "Failed" }
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "Unpaid", label: "Unpaid" },
  { value: "Paid", label: "Paid" },
  { value: "Partial", label: "Partial Payment" }
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

function OutsourceRepair({ jobId, onClose, onSuccess, mode = 'view' }) {
  const [outsourceList, setOutsourceList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const initialFormState = {
    id: Date.now(),
    jobId: "",
    customer: "",
    device: "",
    problem: "",
    accessories: "",
    jobDate: "",
    shopName: "",
    technician: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    receivedDate: "",
    returnStatus: "Pending",
    outsourceCost: "",
    paymentStatus: "Unpaid",
    internalNotes: "",
    photoProof: ""
  };

  const [form, setForm] = useState(initialFormState);

  // Load data on mount
  useEffect(() => {
    loadOutsourceRecords();
    if (jobId) {
      loadJobData(jobId);
      checkExistingRecord(jobId);
    }
  }, [jobId, mode]);

  const loadOutsourceRecords = useCallback(() => {
    try {
      const savedRecords = JSON.parse(localStorage.getItem("nova_outsource_records")) || [];
      setOutsourceList(savedRecords);
    } catch (error) {
      console.error("Error loading records:", error);
      toast.error("Failed to load records");
    }
  }, []);

  const loadJobData = useCallback((id) => {
    try {
      const jobs = JSON.parse(localStorage.getItem("nova_jobs")) || [];
      const job = jobs.find(j => j.id === parseInt(id));
      if (job) {
        setForm(prev => ({
          ...prev,
          jobId: job.id,
          customer: job.name,
          device: job.device, // Note: Typo here (should be device)
          problem: job.problem,
          accessories: Array.isArray(job.accessories) ? job.accessories.join(", ") : job.accessories || "-",
          jobDate: job.date,
          technician: job.assigned || ""
        }));
      }
    } catch (error) {
      console.error("Error loading job:", error);
      toast.error("Failed to load job data");
    }
  }, []);

  const checkExistingRecord = useCallback((jobId) => {
    if (mode === 'view') {
      const records = JSON.parse(localStorage.getItem("nova_outsource_records")) || [];
      const existingRecord = records.find(r => r.jobId == jobId);
      if (existingRecord) {
        setForm(existingRecord);
        setEditingId(existingRecord.id);
      }
    }
  }, [mode]);

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'shopName':
        if (!value.trim()) error = 'Shop name is required';
        break;
      case 'deliveryDate':
        if (!value) error = 'Delivery date is required';
        break;
      case 'outsourceCost':
        if (!value) error = 'Cost is required';
        else if (isNaN(value) || parseFloat(value) < 0) error = 'Invalid cost amount';
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Validate on change
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handlePhotoUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG or GIF images are allowed");
      setIsUploading(false);
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Image must be smaller than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      setIsUploading(false);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photoProof: reader.result }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error("Error reading image file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photoProof: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Required fields
    ['shopName', 'deliveryDate', 'outsourceCost'].forEach(field => {
      const error = validateField(field, form[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      const newRecord = {
        ...form,
        id: editingId || Date.now(),
        deliveryDate: form.deliveryDate || new Date().toISOString().split("T")[0],
        returnStatus: form.returnStatus || "Pending"
      };

      const updatedList = editingId
        ? outsourceList.map(r => (r.id === editingId ? newRecord : r))
        : [...outsourceList, newRecord];

      localStorage.setItem("nova_outsource_records", JSON.stringify(updatedList));
      setOutsourceList(updatedList);
      resetForm();

      toast.success(editingId ? "Record updated" : "Record added");
      window.dispatchEvent(new CustomEvent('outsourceUpdated'));
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-3xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between py-2 mb-6 bg-gray-800">
          <h2 className="text-2xl font-bold text-blue-400">
            {editingId ? "Edit Outsource Record" : "Add Outsource Record"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-4 py-2 transition-colors bg-gray-700 rounded-lg hover:bg-gray-600"
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Job ID */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">Job ID</label>
              <input
                name="jobId"
                value={form.jobId}
                readOnly
                className="w-full p-2 text-gray-400 bg-gray-700 border border-gray-600 rounded"
              />
            </div>

            {/* Customer */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">Customer</label>
              <input
                name="customer"
                value={form.customer}
                readOnly
                className="w-full p-2 text-gray-400 bg-gray-700 border border-gray-600 rounded"
              />
            </div>

            {/* Device */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">Device</label>
              <input
                name="device"
                value={form.device}
                readOnly
                className="w-full p-2 text-gray-400 bg-gray-700 border border-gray-600 rounded"
              />
            </div>

            {/* Shop Name */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">
                Shop Name <span className="text-red-500">*</span>
              </label>
              <input
                name="shopName"
                value={form.shopName}
                onChange={handleChange}
                required
                className={`w-full bg-gray-700 text-white p-2 rounded border ${errors.shopName ? 'border-red-500' : 'border-gray-600'}`}
              />
              {errors.shopName && <p className="mt-1 text-sm text-red-500">{errors.shopName}</p>}
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">
                Delivery Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={form.deliveryDate}
                onChange={handleChange}
                required
                className={`w-full bg-gray-700 text-white p-2 rounded border ${errors.deliveryDate ? 'border-red-500' : 'border-gray-600'}`}
              />
              {errors.deliveryDate && <p className="mt-1 text-sm text-red-500">{errors.deliveryDate}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">Status</label>
              <select
                name="returnStatus"
                value={form.returnStatus}
                onChange={handleChange}
                className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Cost */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">
                Cost (RM) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="outsourceCost"
                value={form.outsourceCost}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className={`w-full bg-gray-700 text-white p-2 rounded border ${errors.outsourceCost ? 'border-red-500' : 'border-gray-600'}`}
              />
              {errors.outsourceCost && <p className="mt-1 text-sm text-red-500">{errors.outsourceCost}</p>}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">Payment Status</label>
              <select
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={handleChange}
                className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded"
              >
                {PAYMENT_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-300">Internal Notes</label>
            <textarea
              name="internalNotes"
              value={form.internalNotes}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded"
            />
          </div>

          {/* Photo Proof */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-300">
              {form.photoProof ? "Proof of Delivery/Receipt" : "Upload Proof (Optional)"}
            </label>
            {form.photoProof ? (
              <div className="relative group">
                <img
                  src={form.photoProof}
                  alt="Proof"
                  className="object-contain w-full bg-black border border-gray-600 rounded max-h-64"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute px-3 py-1 text-sm text-white transition-opacity bg-red-600 rounded-lg opacity-0 top-2 right-2 hover:bg-red-700 group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="p-4 border-2 border-gray-600 border-dashed rounded-lg">
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  onChange={handlePhotoUpload}
                  className="w-full"
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className="mt-2 text-sm text-blue-400">Uploading image...</div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Accepted formats: JPG, PNG, GIF (Max 2MB)
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="sticky bottom-0 flex justify-end gap-3 py-2 pt-4 bg-gray-800">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-white transition-colors border border-gray-600 rounded-lg hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex items-center gap-1 px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingId ? "Updating..." : "Saving..."}
                </>
              ) : (
                editingId ? "Update Record" : "Add Record"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OutsourceRepair;