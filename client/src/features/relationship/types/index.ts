export type FriendRequestDirection = "incoming" | "outgoing";

export type FriendRequestItem = {
  requestId: string;
  name: string;
  imageUrl: string | null;
};

export type FriendRequestActionResponse = {
  message: string;
};

export type UserPhoto = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type FriendPhoto = {
  id: string;
  name: string;
  imageUrl: string | null;
  isOnline: boolean;
};

export type FriendshipRequestUserPhoto = {
  requestId: string;
  name: string;
  imageUrl: string | null;
};
