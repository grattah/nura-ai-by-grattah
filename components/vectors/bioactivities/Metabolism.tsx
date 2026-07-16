import React from "react";

const Metabolism = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="15"
      height="16"
      viewBox="0 0 15 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.5 15.5H14.5M2.5 15.5V7.5L7.5 0.5L12.5 7.5V15.5M5.5 9.5H9.5"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default Metabolism;
