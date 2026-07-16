import React from "react";

const HormonalBalance = React.forwardRef<
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
        d="M2.5 0.5C2.5 0.5 0.5 3.5 0.5 6.5C0.5 9.5 2.5 9.5 2.5 12.5C2.5 15.5 0.5 18.5 0.5 18.5M10.5 0.5C10.5 0.5 12.5 3.5 12.5 6.5C12.5 9.5 10.5 9.5 10.5 12.5C10.5 15.5 12.5 18.5 12.5 18.5M2.5 5.5H10.5M2.5 13.5H10.5"
        stroke="#087567"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default HormonalBalance;
