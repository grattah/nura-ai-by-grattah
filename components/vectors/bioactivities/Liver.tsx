import React from "react";

const Liver = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  () => {
    return (
      <svg
        width="16"
        height="17"
        viewBox="0 0 16 17"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7.5 4.5V12.5M0.5 6.5C0.5 2.5 3.5 0.5 7.5 0.5C11.5 0.5 15.5 2.5 15.5 7.5C15.5 12.5 12.5 16.5 7.5 16.5C3.5 16.5 0.5 13.5 0.5 10.5V6.5Z"
          stroke="#087567"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

export default Liver;
