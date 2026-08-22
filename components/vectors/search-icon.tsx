import { SVGProps } from "react";

const SearchIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 23 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.4 2.8C5.3072 2.8 2.8 5.3072 2.8 8.4C2.8 11.4928 5.3072 14 8.4 14C11.4928 14 14 11.4928 14 8.4C14 5.3072 11.4928 2.8 8.4 2.8ZM0 8.4C0 3.76081 3.76081 0 8.4 0C13.0392 0 16.8 3.76081 16.8 8.4C16.8 10.2142 16.2249 11.894 15.247 13.2671L21.9899 20.01C22.5367 20.5568 22.5367 21.4432 21.9899 21.9899C21.4432 22.5367 20.5568 22.5367 20.01 21.9899L13.2671 15.247C11.894 16.2249 10.2142 16.8 8.4 16.8C3.76081 16.8 0 13.0392 0 8.4Z"
        fill="white"
      />
    </svg>
  );
};

export { SearchIcon };
