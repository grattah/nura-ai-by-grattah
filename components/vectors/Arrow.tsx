import React from "react";

const Arrow = ({ className }: { className: string }) => {
  return (
    <div className={className}>
      <svg
        width="34"
        height="49"
        viewBox="0 0 34 49"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.35311 7C2.85311 15.5 10.8531 34.4 32.8531 48"
          stroke="#227B6F"
          strokeWidth="2"
        />
        <path
          d="M0.431729 7C4.26506 5.16667 9.0544 2.87664 9.8544 1.27664C10.8544 -0.723356 12.3544 8.77664 16.3544 8.77664"
          stroke="#227B6F"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default Arrow;
