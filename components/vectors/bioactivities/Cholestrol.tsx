import React from "react";

const Cholestrol = React.forwardRef<
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
        d="M2.26738 11.5H10.2674M3.26738 13.5H9.26738M6.26738 0.5L1.26738 8.5C-0.732617 11.5 1.26738 16.5 6.26738 16.5C11.2674 16.5 13.2674 11.5 11.2674 8.5L6.26738 0.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default Cholestrol;
