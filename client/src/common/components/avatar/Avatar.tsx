type AvatarProps = {
  imageUrl?: string | null;
  size?: string; // e.g., "w-10 h-10", "w-11 h-11"
  bgColor?: string; // e.g., "bg-indigo-50", "bg-emerald-50"
  textColor?: string; // e.g., "text-indigo-600", "text-emerald-600"
  altText?: string;
};

const Avatar = ({
  imageUrl,
  size = "w-10 h-10",
  bgColor = "bg-indigo-50",
  textColor = "text-indigo-600",
  altText = "User Avatar",
}: AvatarProps) => {
  return (
    <figure
      className={`${size} rounded-full ${bgColor} ${textColor} flex items-center justify-center shrink-0 overflow-hidden`}
    >
      {imageUrl ? (
        <img
          className="w-full h-full object-cover rounded-full"
          src={imageUrl}
          alt={altText}
        />
      ) : (
        <svg
          className="w-1/2 h-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      )}
    </figure>
  );
};

export default Avatar;
