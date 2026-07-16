import React from "react";

const HealthyAging = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="9"
      height="19"
      viewBox="0 0 9 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.5 9.5H8.5M0.5 0.5H8.5V6.5L6.5 9.5L8.5 12.5V18.5H0.5V12.5L2.5 9.5L0.5 6.5V0.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default HealthyAging;
