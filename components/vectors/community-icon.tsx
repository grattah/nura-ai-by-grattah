import { SVGProps } from "react";

interface CommunityIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const CommunityIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7.83496 4.72385V7.83496L10.1683 10.1683M14.835 7.83496C14.835 11.701 11.701 14.835 7.83496 14.835C3.96897 14.835 0.834961 11.701 0.834961 7.83496C0.834961 3.96897 3.96897 0.834961 7.83496 0.834961C11.701 0.834961 14.835 3.96897 14.835 7.83496Z"
        stroke="#57605E"
        strokeWidth="1.67"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const CommunityIconActive = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7 0C10.866 0 14 3.13401 14 7C14 10.866 10.866 14 7 14C3.13401 14 0 10.866 0 7C0 3.13401 3.13401 0 7 0ZM7 2.5C6.44772 2.5 6 2.94772 6 3.5V7C6 7.26522 6.10543 7.51949 6.29297 7.70703L8.76758 10.1816C9.1581 10.5722 9.79112 10.5722 10.1816 10.1816C10.5722 9.79112 10.5722 9.1581 10.1816 8.76758L8 6.58594V3.5C8 2.94772 7.55228 2.5 7 2.5Z"
        fill="#0A4A41"
      />
    </svg>
  );
};

export { CommunityIcon, CommunityIconActive };
