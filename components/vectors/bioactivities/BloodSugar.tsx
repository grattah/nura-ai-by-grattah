import React from "react";

const BloodSugar = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="13"
      height="19"
      viewBox="0 0 13 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.5 0.5C6.5 0.5 0.5 7.5 0.5 11.5C0.5 15.37 3.19 18.5 6.5 18.5C9.81 18.5 12.5 15.37 12.5 11.5C12.5 7.5 6.5 0.5 6.5 0.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 10.5L6.5 8.5L8.5 10.5L6.5 12.5L4.5 10.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default BloodSugar;
