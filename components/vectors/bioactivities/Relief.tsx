import React from "react";

const Relief = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  () => {
    return (
      <svg
        width="13"
        height="19"
        viewBox="0 0 13 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.5 0.5V4.5M6.5 14.5V18.5M0.5 6.5L3.5 8.5M9.5 10.5L12.5 12.5M0.5 12.5L3.5 10.5M9.5 8.5L12.5 6.5M9.5 9.5C9.5 11.1569 8.15685 12.5 6.5 12.5C4.84315 12.5 3.5 11.1569 3.5 9.5C3.5 7.84315 4.84315 6.5 6.5 6.5C8.15685 6.5 9.5 7.84315 9.5 9.5Z"
          stroke="#087567"
          strokeLinecap="round"
        />
      </svg>
    );
  }
);

export default Relief;
