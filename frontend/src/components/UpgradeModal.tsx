import { apiUrl } from "../utils/api";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Props: close handler + callback for successful upgrade
interface UpgradeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function UpgradeModal({ onClose, onSuccess }: UpgradeModalProps) {
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const { token } = useAuth(); // JWT for authorised backend requests

  const handleUpgrade = async () => {
    // Basic payment field validation
    if (!name.trim()) {
      toast.error("Please enter the name on the card.");
      return;
    }
    if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ""))) {
      toast.error("Please enter a valid 16-digit card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      toast.error("Please enter the expiry as MM/YY.");
      return;
    }
    if (!/^\d{3}$/.test(cvv)) {
      toast.error("Please enter a valid 3-digit CVV.");
      return;
    }

    try {
      // Protected upgrade request using the user's JWT
      const response = await fetch(apiUrl("/upgrade"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        onSuccess(); // notify parent component
        onClose();   // close modal
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Could not reach the server. Please try again later.");
    }
  };

  return (
    // Overlay - clicking outside closes the modal
    <div className="modal-overlay" onClick={onClose}>
      {/* Prevent closing when interacting inside the modal */}
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-card__title">Upgrade to Paid</h2>
        <p className="modal-card__subtitle">Enter your payment details</p>

        <label className="auth-label">Name on card</label>
        <input
          className="auth-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="auth-label">Card number</label>
        <input
          className="auth-input"
          type="text"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
        />

        <div className="modal-row">
          <div>
            <label className="auth-label">Expiry (MM/YY)</label>
            <input
              className="auth-input"
              type="text"
              placeholder="12/28"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
          <div>
            <label className="auth-label">CVV</label>
            <input
              className="auth-input"
              type="text"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="auth-button" onClick={handleUpgrade}>Confirm Payment</button>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
