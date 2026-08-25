import { SVGProps } from "react";

const BookmarkIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7 5.5998C7 4.05341 8.2536 2.7998 9.8 2.7998H18.2C19.7464 2.7998 21 4.05341 21 5.5998V25.1998L14 21.6998L7 25.1998V5.5998Z"
        fill="white"
      />
    </svg>
  );
};

export { BookmarkIcon };
