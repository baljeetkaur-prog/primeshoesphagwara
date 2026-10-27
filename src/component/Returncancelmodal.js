// ReturnCancelModal.jsx
import React, { useState } from 'react';
import "./ReturnCancelModal.css"; 

const ReturnCancelModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  type,
  paymentMode   
}) => {
  
  const [reason, setReason] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: ""
  });

  const handleConfirm = () => {
    if (!reason.trim()) {
      alert("Please provide a reason");
      return;
    }

    // Basic validation for COD return
    if (type === 'return' && paymentMode === 'cod') {
      if (!bankDetails.accountHolderName.trim() || 
          !bankDetails.accountNumber.trim() || 
          !bankDetails.ifscCode.trim()) {
        alert("Please fill all required bank details for COD return");
        return;
      }
    }

    // Send data
    if (type === 'return' && paymentMode === 'cod') {
      onSubmit(reason.trim(), bankDetails);
    } else {
      onSubmit(reason.trim());
    }

    // Reset form
    setReason("");
    setBankDetails({
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: ""
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal">
        <h5>
          {type === 'cancel' ? 'Cancel Item' : 'Request Return'}
        </h5>

        <div className="modal-content">
          <textarea
            placeholder="Please provide your reason (e.g., Wrong size, Damaged product, etc.)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows="4"
          />

          {/* Bank Details Form - Only for COD Returns */}
          {type === 'return' && paymentMode === 'cod' && (
            <div className="bank-details-section">
              <h6>Refund Bank Details (Required for COD)</h6>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Please enter your bank details to receive the refund
              </p>

              <input
                type="text"
                placeholder="Account Holder Name *"
                value={bankDetails.accountHolderName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                required
              />

              <input
                type="text"
                placeholder="Account Number *"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                required
              />

              <input
                type="text"
                placeholder="IFSC Code *"
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                required
              />

              <input
                type="text"
                placeholder="UPI ID (Optional)"
                value={bankDetails.upiId}
                onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="confirm-btn" onClick={handleConfirm}>
            {type === 'return' ? 'Submit Return Request' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnCancelModal;