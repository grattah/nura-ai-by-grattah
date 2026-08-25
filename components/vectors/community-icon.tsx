import { SVGProps } from "react";

interface CommunityIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const CommunityIcon = (props: SVGProps<SVGSVGElement>) => {
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
        d="M14 2.80029C20.1855 2.80029 25.2 7.8141 25.2002 13.9995C25.2002 20.1851 20.1856 25.1997 14 25.1997C7.81459 25.1995 2.80078 20.185 2.80078 13.9995C2.80099 7.81423 7.81472 2.8005 14 2.80029ZM14 7.3999C13.4479 7.40011 13 7.84775 13 8.3999V13.9995C13 14.2645 13.1057 14.519 13.293 14.7065L17.2529 18.6665C17.6434 19.057 18.2765 19.0568 18.667 18.6665C19.0573 18.276 19.0575 17.6429 18.667 17.2524L15 13.5854V8.3999C15 7.84762 14.5523 7.3999 14 7.3999Z"
        fill="white"
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
        fill="#FFFFFF"
      />
    </svg>
  );
};

export { CommunityIcon, CommunityIconActive };
