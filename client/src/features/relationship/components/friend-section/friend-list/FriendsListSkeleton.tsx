import FriendListItemSkeleton from "./FriendListItemSkeleton";

type FriendsListSkeletonProps = {
  count?: number;
};

const FriendsListSkeleton = ({ count = 4 }: FriendsListSkeletonProps) => {
  return (
    <ul className="space-y-2.5" aria-label="Loading friends">
      {Array.from({ length: count }, (_, index) => (
        <FriendListItemSkeleton key={index} />
      ))}
    </ul>
  );
};

export default FriendsListSkeleton;
