import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import UpgradeModal from "../components/UpgradeModal";

// Feature lists for each plan
const freeFeatures = [
  "Access to all free posts",
  "Post up to 5 questions per month",
  "Standard image upload size (2MB)",
  "Community support",
];

const paidFeatures = [
  "Everything in Free, plus:",
  "Early access to paid posts",
  "Unlimited posts per month",
  "Larger image uploads (20MB)",
  "Priority support",
];

function Pricing() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Handle Upgrade button behaviour
  const handleUpgradeClick = () => {
    if (!user) {
      toast.error("Please log in to upgrade your plan.");
      navigate("/login");
      return;
    }
    setShowModal(true); // logged‑in free user
  };

  // Update user context after a successful upgrade
  const handleUpgradeSuccess = () => {
    if (user && token) {
      login(token, { ...user, plan: "paid" });
    }
  };

  return (
    <div className="pricing-page">
      <h1 className="pricing-page__title">Choose Your Plan</h1>
      <p className="pricing-page__subtitle">
        Upgrade anytime to unlock the full DEV@Deakin experience.
      </p>

      <div className="pricing-grid">
        {/* Free plan */}
        <div className="pricing-card">
          <h2 className="pricing-card__name">Free</h2>
          <p className="pricing-card__price">$0<span>/month</span></p>
          <ul className="pricing-card__features">
            {freeFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {user?.plan === "free" && (
            <p className="pricing-card__current">Your current plan</p>
          )}
        </div>

        {/* Paid plan */}
        <div className="pricing-card pricing-card--featured">
          <h2 className="pricing-card__name">Paid</h2>
          <p className="pricing-card__price">$9<span>/month</span></p>
          <ul className="pricing-card__features">
            {paidFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          {/* Paid users see confirmation. Others see upgrade button */}
          {user?.plan === "paid" ? (
            <p className="pricing-card__current">✓ You're on the Paid plan</p>
          ) : (
            <button className="pricing-card__btn" onClick={handleUpgradeClick}>
              Upgrade Plan
            </button>
          )}
        </div>
      </div>

      {/* Upgrade modal */}
      {showModal && (
        <UpgradeModal
          onClose={() => setShowModal(false)}
          onSuccess={handleUpgradeSuccess}
        />
      )}
    </div>
  );
}

export default Pricing;
