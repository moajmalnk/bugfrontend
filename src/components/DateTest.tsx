import {
  formatLocalDate,
  getCurrentLocalDate,
  getCurrentLocalTime,
} from "@/lib/utils/dateUtils";
import React from "react";

/**
 * Test component to verify date formatting is working correctly
 * This component should be removed before production deployment
 */
export const DateTest: React.FC = () => {
  // Test with various date formats
  const now = new Date();
  const utcString = now.toISOString();
  const localString = now.toString();

  return (
    <div className="p-4 border rounded-lg bg-background">
      <h3 className="text-lg font-semibold mb-4">Date Formatting Test</h3>

      <div className="space-y-3 text-sm">
        <div>
          <strong>Current UTC ISO String:</strong> {utcString}
        </div>

        <div>
          <strong>Current Local String:</strong> {localString}
        </div>

        <div>
          <strong>Current Local Time:</strong> {getCurrentLocalTime()}
        </div>

        <div>
          <strong>Current Local Date:</strong> {getCurrentLocalDate()}
        </div>

        <hr className="my-3" />

        <div>
          <strong>UTC to Local Date:</strong>{" "}
          {formatLocalDate(utcString, "date")}
        </div>

        <div>
          <strong>UTC to Local Time:</strong>{" "}
          {formatLocalDate(utcString, "time")}
        </div>

        <div>
          <strong>UTC to Local DateTime:</strong>{" "}
          {formatLocalDate(utcString, "datetime")}
        </div>

        <div>
          <strong>UTC to Relative:</strong>{" "}
          {formatLocalDate(utcString, "relative")}
        </div>
      </div>
    </div>
  );
};
