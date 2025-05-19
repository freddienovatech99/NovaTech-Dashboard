import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  PhotoIcon,
  UserIcon,
  CpuChipIcon,
  WrenchIcon,
  PlusIcon,
  IdentificationIcon,
  CheckIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import countryCodes from './countryCodes';

const JobForm = ({ onSave, editData, role, onClose }) => {
  // State declarations
  const defaultCountry = countryCodes.find(c => c.code === '60') || countryCodes[0];
  const [formData, setFormData] = useState({
    id: '001000',
    name: '',
    countryCode: defaultCountry.code,
    phone: '',
    icNumber: '',
    device: '',
    deviceType: '',
    customDeviceType: '',
    problem: '',
    accessories: [],
    status: 'checking',
    date: new Date().toISOString().split('T')[0],
    assigned: '',
    technician: '',
    remark: '',
    photo: '',
    source: '',
    newAccessory: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingId, setIsEditingId] = useState(false);

  // Status options configuration
  const statusOptions = [
    { value: 'checking', label: 'Checking', icon: '🔍', color: 'blue' },
    { value: 'waiting parts', label: 'Waiting Parts', icon: '⏳', color: 'yellow' },
    { value: 'waiting customer confirmation', label: 'Customer Confirmation', icon: '📩', color: 'orange' },
    { value: 'item fixed', label: 'Item Fixed', icon: '✅', color: 'green' },
    { value: 'pending pick-up', label: 'Pending Pick-up', icon: '📦', color: 'purple' },
    { value: 'done', label: 'Done', icon: '🏁', color: 'gray' }
  ];

  // Initialize form data
useEffect(() => {
  if (editData) {
    setFormData({
      ...editData,
      date: editData.date.split('T')[0],
      newAccessory: '',
      technician: editData.technician || '',
      photo: editData.photo || '',
      accessories: editData.accessories.map(acc => 
        typeof acc === 'string' ? { id: Math.random().toString(36).substr(2, 9), name: acc } : acc
      )
    });
  }
}, [editData]);

  // Form handlers
const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  if (name === 'newAccessory' && value.trim()) {
    setErrors(prev => ({ ...prev, newAccessory: '' }));
  }
};

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    let jobToSave = {
      ...formData,
      accessories: formData.accessories.map(acc => acc.name),
      date: new Date(formData.date).toISOString(),
      technician: formData.technician
    };

    if (!editData) {
      const lastId = localStorage.getItem('lastJobId') || '000999';
      const newId = String(parseInt(lastId) + 1).padStart(6, '0');
      localStorage.setItem('lastJobId', newId);
      jobToSave.id = newId;
    }

    setTimeout(() => {
      onSave(jobToSave);
      setIsSubmitting(false);
    }, 500);
  };

  const addAccessory = () => {
  const trimmed = formData.newAccessory.trim();
  if (!trimmed) {
    setErrors(prev => ({ ...prev, newAccessory: 'Accessory name required' }));
    return;
  }
  
  const newItem = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    name: trimmed
  };
  
  setFormData(prev => ({
    ...prev,
    accessories: [...prev.accessories, newItem],
    newAccessory: ''
  }));
};

  const removeAccessory = (id) => {
    setFormData(prev => ({
      ...prev,
      accessories: prev.accessories.filter(acc => acc.id !== id)
    }));
  };

  // Photo upload handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.match('image.*')) {
      setErrors(prev => ({ ...prev, photo: 'Please select an image file' }));
      return;
    }

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Image must be less than 2MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        photo: event.target.result
      }));
      setErrors(prev => ({ ...prev, photo: '' }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photo: ''
    }));
  };

  // Validation logic
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone required';
    if (!formData.device.trim()) newErrors.device = 'Device required';
    if (!formData.problem.trim()) newErrors.problem = 'Problem description required';
    if (!formData.technician.trim()) newErrors.technician = 'Technician selection required';
    if (formData.deviceType === 'OTHER' && !formData.customDeviceType.trim()) {
    newErrors.customDeviceType = 'Custom device type required';}

    const phoneRegex = /^[0-9]{7,15}$/;
    if (!phoneRegex.test(formData.phone)) newErrors.phone = 'Invalid phone format';

    const icRegex = /^[0-9]{4}$/;
    if (formData.icNumber && !icRegex.test(formData.icNumber)) newErrors.icNumber = 'Must be 4 digits';

    const idRegex = /^[0-9]{6}$/;
    if (!idRegex.test(formData.id)) newErrors.id = 'Job ID must be 6 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <form onSubmit={handleSubmit} className="bg-gray-800 text-gray-100 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold">
              {editData ? 'Edit Job' : 'Create New Job'}
            </h2>
            <div className="flex items-center mt-1">
              <span className="mr-2 text-sm text-gray-400">Job ID:</span>
              {isEditingId ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    className={`w-24 p-1 bg-gray-700 ${errors.id ? 'border-red-500' : 'border-gray-600'} border rounded`}
                    maxLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingId(false)}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm font-medium">{formData.id}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingId(true)}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              <span className="mx-2 text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-400">Created: {new Date(formData.date).toLocaleDateString()}</span>
            </div>
            {errors.id && <p className="mt-1 text-sm text-red-400">{errors.id}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="p-5 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold">Customer Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full p-3 bg-gray-600 ${errors.name ? 'border-red-500' : 'border-gray-500'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleChange}
                      className="w-1/3 p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      {countryCodes.map(code => (
                        <option key={code.code} value={code.code}>
                          +{code.code} {code.country === 'Malaysia' ? '(MY)' : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`flex-1 p-3 bg-gray-600 ${errors.phone ? 'border-red-500' : 'border-gray-500'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="123456789"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    IC Number (Last 4 digits)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <IdentificationIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="icNumber"
                      value={formData.icNumber}
                      onChange={handleChange}
                      maxLength="4"
                      className={`w-full p-3 pl-10 bg-gray-600 ${errors.icNumber ? 'border-red-500' : 'border-gray-500'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="1234"
                    />
                  </div>
                  {errors.icNumber && <p className="mt-1 text-sm text-red-400">{errors.icNumber}</p>}
                </div>
              </div>
            </div>

            {/* Device Information */}
            <div className="p-5 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <CpuChipIcon className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold">Device Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Device Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="deviceType"
                    value={formData.deviceType}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="COMPUTER">Computer</option>
                    <option value="LAPTOP">Laptop</option>
                    <option value="MOBILE">Mobile Phone</option>
                    <option value="TABLET">Tablet</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {formData.deviceType === 'OTHER' && (
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      Custom Device Type <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="customDeviceType"
                      value={formData.customDeviceType}
                      onChange={handleChange}
                      className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specify device type"
                    />
                  </div>
                )}

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Device Model <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="device"
                    value={formData.device}
                    onChange={handleChange}
                    className={`w-full p-3 bg-gray-600 ${errors.device ? 'border-red-500' : 'border-gray-500'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="e.g., MacBook Pro M1"
                  />
                  {errors.device && <p className="mt-1 text-sm text-red-400">{errors.device}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Repair Information */}
            <div className="p-5 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <WrenchIcon className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold">Repair Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Status <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value} className={`text-${option.color}-400`}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Assigned Technician <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="technician"
                    value={formData.technician}
                    onChange={handleChange}
                    className={`w-full p-3 bg-gray-600 ${errors.technician ? 'border-red-500' : 'border-gray-500'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="">Select Technician</option>
                    <option value="Freddie">Freddie</option>
                    <option value="Azri">Azri</option>
                    <option value="Intern">Intern</option>
                  </select>
                  {errors.technician && <p className="mt-1 text-sm text-red-400">{errors.technician}</p>}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Problem Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="problem"
                    value={formData.problem}
                    onChange={handleChange}
                    className={`w-full p-3 bg-gray-600 ${errors.problem ? 'border-red-500' : 'border-gray-500'} rounded-lg focus:ring-blue-500 focus:border-blue-500 h-32`}
                    placeholder="Describe the problem in detail..."
                  />
                  {errors.problem && <p className="mt-1 text-sm text-red-400">{errors.problem}</p>}
                </div>
              </div>
            </div>

            {/* Accessories */}
            <div className="p-5 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <PhotoIcon className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold">Accessories</h3>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.accessories.filter(Boolean).map((acc) => (
                    <span key={acc.id} className="inline-flex items-center px-3 py-1 text-blue-200 bg-blue-900 rounded-full"> 
                       {acc?.name}
                      {/* {acc.name} */}
                      <button
                        type="button"
                        onClick={() => removeAccessory(acc.id)}
                        className="ml-1.5 text-blue-300 hover:text-blue-100"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    name="newAccessory"
                    value={formData.newAccessory}
                    onChange={handleChange}
                    className="flex-1 p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add accessory (e.g., Charger, Case)"
                  />
                  <button
                    type="button"
                    onClick={addAccessory}
                    className="flex items-center px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Device Photo */}
            <div className="p-5 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <PhotoIcon className="w-6 h-6 text-pink-400" />
                <h3 className="text-lg font-semibold">Device Photo</h3>
              </div>

              <div className="p-4 text-center border-2 border-gray-500 border-dashed rounded-lg">
                {formData.photo ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={formData.photo} 
                      alt="Device preview" 
                      className="mb-2 rounded max-h-40"
                    />
                    <div className="flex gap-2 mt-2">
                      <label
                        htmlFor="photo-upload"
                        className="px-3 py-1 text-sm text-white transition-colors bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700"
                      >
                        Change Photo
                      </label>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="px-3 py-1 text-sm text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <PhotoIcon className="w-12 h-12 mx-auto text-gray-500" />
                    <p className="mt-2 text-sm text-gray-400">Upload a clear photo of the device</p>
                    <label
                      htmlFor="photo-upload"
                      className="inline-block px-4 py-2 mt-3 text-white transition-colors bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700"
                    >
                      Select Photo
                    </label>
                  </>
                )}
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  aria-label="Device photo upload"
                />
                {errors.photo && <p className="mt-2 text-sm text-red-400">{errors.photo}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-4 p-4 bg-gray-800 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 transition-colors border border-gray-600 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
         <button
  type="submit"
  className={`flex items-center gap-2 px-6 py-2 text-white transition-colors rounded-lg ${
    isSubmitting ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
  }`}
  disabled={isSubmitting}
>
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                Save Job
              </>
            )}
         </button>
        </div>
      </form>
    </div>
  );
};
// PropTypes validation
JobForm.propTypes = {
  onSave: PropTypes.func.isRequired,
  editData: PropTypes.object,
  role: PropTypes.string,
  onClose: PropTypes.func.isRequired
};    
export default JobForm;