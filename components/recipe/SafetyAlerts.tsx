"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

import SafetyAlert from "@/components/vectors/SafetyAlert";

export interface SafetyAlertItem {
  type: "allergy" | "medication";
  message: string;
}

const SafetyAlerts = ({ alerts }: { alerts: SafetyAlertItem[] }) => {
  const [display, setDisplay] = React.useState(false);

  const toggleDisplay = () => {
    setDisplay(!display);
  };

  if (!alerts.length) return null;

  return (
    <div
      className={`pt-3 px-4 rounded-xl flex flex-col gap-3 bg-warning-c200 ${
        display && "pb-3"
      }`}
    >
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-2">
          <SafetyAlert />
          <p className="font-medium text-base text-base-text">
            {alerts.length} safety {alerts.length === 1 ? "alert" : "alerts"}{" "}
            found
          </p>
        </div>
        <button onClick={toggleDisplay} aria-label="Toggle safety alerts">
          <ChevronDown
            size={20}
            color="#3F4644"
            strokeWidth={2}
            className={`transition-transform ${display ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          display ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 bg-warning-c50 rounded-2xl flex flex-col gap-3">
            {alerts.map((item, index) => {
              return (
                <div
                  key={index}
                  className={`flex gap-2.5 items-start p-2 ${
                    index !== alerts.length - 1 && "border-b"
                  }`}
                >
                  <p
                    className={`pt-0.5 pb-1 px-2 border rounded-full text-2xs capitalize font-inter font-medium shrink-0 ${
                      item.type === "allergy"
                        ? "text-warning-c600 border-warning-c400 bg-warning-c100"
                        : "text-error-c600 border-error-c400 bg-error-c100"
                    }`}
                  >
                    {item.type}
                  </p>
                  <p className="text-sm font-medium text-black">
                    {item.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyAlerts;
