import React from "react";

const StressControl = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="19"
      height="15"
      viewBox="0 0 19 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.5 12.5L5.5 4.5L9.5 8.5L13.5 0.5L18.5 12.5M0.5 14.5H18.5"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default StressControl;
