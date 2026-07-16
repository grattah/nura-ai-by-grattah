import React from "react";

const Inflammation = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="15"
      height="20"
      viewBox="0 0 15 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 13.5H10.5M7.5 0.5C7.5 0.5 0.5 7.5 0.5 12.5C0.5 16.37 3.63 19.5 7.5 19.5C11.37 19.5 14.5 16.37 14.5 12.5C14.5 7.5 7.5 0.5 7.5 0.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default Inflammation;
