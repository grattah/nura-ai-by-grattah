import React from "react";

const ActivitiesIcon = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 6V10L13 13M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
        stroke="#57605E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ActiveActivitiesIcon = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.59961 0C14.9014 0 19.2 4.29786 19.2002 9.59961C19.2002 14.9015 14.9015 19.2002 9.59961 19.2002C4.29786 19.2 0 14.9014 0 9.59961C0.000210789 4.29799 4.29799 0.000210793 9.59961 0ZM9.59961 3.7998C9.04757 3.80002 8.59972 4.24774 8.59961 4.7998V9.59961C8.59961 9.86464 8.70529 10.1191 8.89258 10.3066L12.2861 13.7012C12.6766 14.0917 13.3106 14.0916 13.7012 13.7012C14.0915 13.3107 14.0913 12.6776 13.7012 12.2871L10.5996 9.18555V4.7998C10.5995 4.24761 10.1518 3.7998 9.59961 3.7998Z"
        fill="#F0E8DD"
      />
    </svg>
  );
};

export { ActivitiesIcon, ActiveActivitiesIcon };
