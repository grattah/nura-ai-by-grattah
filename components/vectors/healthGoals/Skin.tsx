import React from "react";

const Skin = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  () => {
    return (
      <svg
        width="17"
        height="19"
        viewBox="0 0 17 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.8333 17.5002V8.3335C15.8333 4.19141 12.4753 0.833496 8.33325 0.833496C4.19117 0.833496 0.833252 4.19141 0.833252 8.3335V17.5002"
          stroke="#227B6F"
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.33317 17.0833C10.6344 17.0833 12.4998 13.3525 12.4998 8.75H4.1665C4.1665 13.3525 6.03192 17.0833 8.33317 17.0833Z"
          stroke="#227B6F"
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

export default Skin;
