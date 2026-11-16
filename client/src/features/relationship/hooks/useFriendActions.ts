import useAcceptFriend from "./useAcceptFriend";
import useRejectFriend from "./useRejectFriend";

export const useFriendActions = () => {
  const { loading: acceptLoading, acceptFriend } = useAcceptFriend();
  const { loading: rejectLoading, rejectFriend } = useRejectFriend();

  const isResponding = acceptLoading || rejectLoading;

  const handleAcceptFriend = async (requesterId: string) => {
    await acceptFriend(requesterId);
  };

  const handleRejectFriend = async (requesterId: string) => {
    await rejectFriend(requesterId);
  };

  return {
    handleAcceptFriend,
    handleRejectFriend,
    acceptLoading,
    rejectLoading,
    isResponding,
  };
};
