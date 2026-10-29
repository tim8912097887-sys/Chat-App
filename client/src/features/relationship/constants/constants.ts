const FRIEND_REQUESTS_URL = "/";
const FRIEND_REQUESTS_LIMIT = 5;
const FRIEND_SEARCH_LIMIT = 5;
const ACCEPT_FRIEND_REQUEST_URL = (requestId: string) => `/${requestId}/accept`;
const REJECT_FRIEND_REQUEST_URL = (requestId: string) => `/${requestId}/reject`;

export {
  FRIEND_REQUESTS_URL,
  FRIEND_REQUESTS_LIMIT,
  FRIEND_SEARCH_LIMIT,
  ACCEPT_FRIEND_REQUEST_URL,
  REJECT_FRIEND_REQUEST_URL,
};
