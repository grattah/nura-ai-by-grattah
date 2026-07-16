"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

import SafetyAlert from "@/components/vectors/SafetyAlert";

const safetyAlerts = [
  {
    cause: "allergy",
    warning: "Contains coconut. You reported a coconut allergy",
  },
  {
    cause: "medication",
    warning: `"Grapefruit may interact with medications you’re taking. (CPY3A4 interaction)"`,
  },
];

const SafetyAlerts = () => {
  const [display, setDisplay] = React.useState(false);

  const toggleDisplay = () => {
    setDisplay(!display);
  };

  return (
    <div
      className={`pt-3 px-4 rounded-xl flex flex-col gap-3 bg-warning-c200 ${
        display && "pb-3"
      }`}
    >
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-2">
          <SafetyAlert />
          <p className="font-medium text-base">{safetyAlerts.length} safety alerts found</p>
        </div>
        <button onClick={toggleDisplay}>
          <ChevronDown size={20} color="#3F4644" strokeWidth={2} />
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          display ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 bg-warning-c50 rounded-2xl flex flex-col gap-3">
            {safetyAlerts.map((item, index) => {
              return (
                <div
                  key={index}
                  className={`flex gap-2.5 items-start p-2 ${
                    index !== safetyAlerts.length - 1 && "border-b"
                  }`}
                >
                  <p
                    className={`pt-0.5 pb-1 px-2 border rounded-full text-2xs capitalize ${
                      item.cause === "allergy"
                        ? "text-warning-c600 border-warning-c400 bg-warning-c100"
                        : item.cause === "medication"
                        ? "text-error-c600 border-error-c400 bg-error-c100"
                        : ""
                    }`}
                  >
                    {item.cause}
                  </p>
                  <p className="text-sm font-medium text-black">
                    {item.warning}
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
