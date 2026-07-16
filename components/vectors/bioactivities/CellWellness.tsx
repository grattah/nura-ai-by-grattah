import React from "react";

const CellWellness = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(() => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.5 8.5C16.5 12.9183 12.9183 16.5 8.5 16.5M16.5 8.5C16.5 4.08172 12.9183 0.5 8.5 0.5M16.5 8.5H13.5M8.5 16.5C4.08172 16.5 0.5 12.9183 0.5 8.5M8.5 16.5V13.5M0.5 8.5C0.5 4.08172 4.08172 0.5 8.5 0.5M0.5 8.5H3.5M8.5 0.5V3.5M11.5 8.5C11.5 10.1569 10.1569 11.5 8.5 11.5C6.84315 11.5 5.5 10.1569 5.5 8.5C5.5 6.84315 6.84315 5.5 8.5 5.5C10.1569 5.5 11.5 6.84315 11.5 8.5Z"
        stroke="#087567"
        strokeLinecap="round"
      />
    </svg>
  );
});

export default CellWellness;
