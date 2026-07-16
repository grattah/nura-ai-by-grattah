import React from "react";

const FluidBalance = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="13"
      height="17"
      viewBox="0 0 13 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.5 16.5C0.5 16.5 2.5 14.5 2.5 12.5C2.5 10.5 0.5 9.5 0.5 6.5C0.5 2.5 3.5 0.5 6.5 0.5C9.5 0.5 12.5 2.5 12.5 6.5C12.5 9.5 10.5 10.5 10.5 12.5C10.5 14.5 12.5 16.5 12.5 16.5"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default FluidBalance;
