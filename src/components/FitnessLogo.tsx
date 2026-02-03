interface FitnessLogoProps {
  className?: string;
}

const FitnessLogo = ({ className }: FitnessLogoProps) => (
  <svg
    className={className}
    viewBox="0 0 64 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="0" y="2" width="32" height="4" rx="2" fill="currentColor" />
    <rect x="0" y="10" width="26" height="4" rx="2" fill="currentColor" />
    <rect x="0" y="18" width="20" height="4" rx="2" fill="currentColor" />
  </svg>
);

export default FitnessLogo;
