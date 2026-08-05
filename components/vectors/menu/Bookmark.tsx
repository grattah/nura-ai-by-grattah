import React from "react";

const BookmarkIcon = () => {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 3C1 1.89543 1.89543 1 3 1H13C14.1046 1 15 1.89543 15 3V19L8 15.5L1 19V3Z"
        stroke="#57605E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ActiveBookmarkIcon = () => {
  return (
    <svg
      width="12"
      height="20"
      viewBox="0 0 12 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 2.4C0 1.07452 1.07452 0 2.4 0H9.6C10.9255 0 12 1.07452 12 2.4V19.2L6 16.2L0 19.2V2.4Z"
        fill="#F0E8DD"
      />
    </svg>
  );
};

export { BookmarkIcon, ActiveBookmarkIcon };
