import React from "react";

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-[#3f2817]">
      <h1 className="text-3xl font-black mb-4">Privacy Policy</h1>
      <p className="mb-3">
        We collect only the information needed to process orders, deliver
        products, and support your account.
      </p>
      <p className="mb-3">
        Personal data may include your name, email, delivery address, and order
        history. Payment card details are processed by Stripe and are not stored
        by us.
      </p>
      <p className="mb-3">
        We keep data only as long as needed for legal, tax, and operational
        purposes. To remove your data, log in to your account, open Settings,
        and click the Delete button.
      </p>
      <p className="text-sm text-[#6f5337]">
        Last updated: February 10, 2026
      </p>
    </div>
  );
}
