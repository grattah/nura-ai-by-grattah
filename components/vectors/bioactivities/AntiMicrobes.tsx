import React from "react";

const AntiMicrobes = React.forwardRef<
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
        d="M6.5 14.5V6.5C4.5 8.5 3.5 10.5 3.5 12.5M6.5 0.5C3.5 3.5 0.5 5.5 0.5 9.5C0.5 13.5 2.5 16.5 6.5 16.5C10.5 16.5 12.5 13.5 12.5 9.5C12.5 5.5 9.5 3.5 6.5 0.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default AntiMicrobes;
