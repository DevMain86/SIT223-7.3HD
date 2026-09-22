import { apiUrl } from "../utils/api";
import { useState } from "react";
import { toast } from "react-toastify";

function SubscribeBar() {
  const [email, setEmail] = useState("");

  const handleSubscribe = async () => {
    // Quick front-end check before making the request
    if (!email.trim()) {
      toast.error("Please enter your email first.");
      return;
    }

    try {
      // POST the email to the backend's /subscribe endpoint
      const response = await fetch(apiUrl("/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // The backend always replies with a JSON { message }
      const data = await response.json();

      if (response.ok) {
        // 2xx status - success. Show the backend's message and clear the field.
        toast.success(data.message);
        setEmail("");
      } else {
        // Non-2xx (e.g. 400) - the request completed but was rejected.
        // Show the reason the backend gave.
        toast.error(data.message);
      }
    } catch {
      // fetch threw - the request never completed
      toast.error("Could not reach the server. Please try again later.");
    }
  };

  return (
    <div className="subscribe-bar">
      <span className="subscribe-bar__label">SIGN UP FOR OUR DAILY INSIDER</span>
      <input
        className="subscribe-bar__input"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="subscribe-bar__btn" onClick={handleSubscribe}>
        Subscribe
      </button>
    </div>
  );
}

export default SubscribeBar;