import React from "react";

const Temperature = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="9"
      height="22"
      viewBox="0 0 9 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 16.5V8.5M6.5 13.5V2.5C6.5 1.4 5.6 0.5 4.5 0.5C3.4 0.5 2.5 1.4 2.5 2.5V13.5C1.3 14.3 0.5 15.6 0.5 17C0.5 19.2 2.3 21 4.5 21C6.7 21 8.5 19.2 8.5 17C8.5 15.6 7.7 14.3 6.5 13.5Z"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default Temperature;
