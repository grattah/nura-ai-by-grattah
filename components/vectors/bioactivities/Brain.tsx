import React from "react";

const Brain = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  () => {
    return (
      <svg
        width="17"
        height="18"
        viewBox="0 0 17 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2.5 5.5C2.5 2.5 5.5 0.5 8.5 0.5C11.5 0.5 14.5 2.5 14.5 5.5C14.5 7.5 13.5 8.5 14.5 10.5C15.5 12.5 16.5 13.5 16.5 15.5C16.5 16.5 15.5 17.5 13.5 17.5C11.5 17.5 10.5 15.5 8.5 15.5C6.5 15.5 5.5 17.5 3.5 17.5C1.5 17.5 0.5 16.5 0.5 15.5C0.5 13.5 1.5 12.5 2.5 10.5C3.5 8.5 2.5 7.5 2.5 5.5Z"
          stroke="#087567"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

export default Brain;
