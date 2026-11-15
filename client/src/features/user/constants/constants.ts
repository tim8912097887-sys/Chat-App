const USER_SEARCH_URL = "/search";
const FRIEND_SEARCH_URL = "/friend/search";
const USER_PROFILE_URL = "/profile";
const RELATIONSHIP_STATE = {
  SELF: "self",
  NONE: "none",
  INVITE: "invite",
  RECIPIENT: "recipient",
  FRIEND: "friend",
} as const;

export {
  USER_SEARCH_URL,
  FRIEND_SEARCH_URL,
  USER_PROFILE_URL,
  RELATIONSHIP_STATE,
};
