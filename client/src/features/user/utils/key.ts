export const getSearchUserKey = (
  userId: string | undefined,
  searchCode?: string,
) => {
  if (searchCode) {
    return ["search-user", userId, searchCode];
  }

  return ["search-user", userId];
};

export const getUserProfileKey = (userId: string | undefined) => [
  "user-profile",
  userId,
];
