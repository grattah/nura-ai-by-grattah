import React from "react";

const SearchIcon = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 19L13 13M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z"
        stroke="#57605E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ActiveSearchIcon = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.2 2.4C4.54903 2.4 2.4 4.54903 2.4 7.2C2.4 9.85097 4.54903 12 7.2 12C9.85097 12 12 9.85097 12 7.2C12 4.54903 9.85097 2.4 7.2 2.4ZM0 7.2C0 3.22355 3.22355 0 7.2 0C11.1764 0 14.4 3.22355 14.4 7.2C14.4 8.755 13.9071 10.1949 13.0689 11.3718L18.8485 17.1515C19.3172 17.6201 19.3172 18.3799 18.8485 18.8485C18.3799 19.3172 17.6201 19.3172 17.1515 18.8485L11.3718 13.0689C10.1949 13.9071 8.755 14.4 7.2 14.4C3.22355 14.4 0 11.1764 0 7.2Z"
        fill="#F0E8DD"
      />
    </svg>
  );
};

export { SearchIcon, ActiveSearchIcon };
