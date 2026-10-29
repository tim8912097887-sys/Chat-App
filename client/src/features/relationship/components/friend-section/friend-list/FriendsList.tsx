import { useState } from "react";
import RetrySection from "../../../../../common/components/retry/RetrySection";
import useDebounce from "../../../../../common/hooks/useDebounce";
import useGetFriends from "../../../hooks/useGetFriends";
import FriendListItem from "./FriendListItem";
import FriendsListSkeleton from "./FriendsListSkeleton";
import FriendsListEmptySection from "./FriendsListEmptySection";

const FriendsList = () => {
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce({
    value: searchString,
    delayTime: 1000,
  });
  const { data, loading, retry, error } = useGetFriends(debouncedSearchString);
  const isInitialLoading = loading && data === null;
  const hasError = Boolean(error);
  const isEmpty =
    !isInitialLoading && !hasError && data !== null && data.length === 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
        <svg
          className="w-5 h-5 text-indigo-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3>Your friends</h3>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search friends by name"
          aria-label="Search friends by name"
          value={searchString}
          onChange={(event) => setSearchString(event.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
        />
      </div>

      {/* Friends List */}
      {isInitialLoading && <FriendsListSkeleton />}
      {!isInitialLoading && error && (
        <RetrySection retrying={loading} onRetry={retry} message={error} />
      )}
      {isEmpty && <FriendsListEmptySection />}
      {!isInitialLoading && !hasError && data && data.length > 0 && (
        <ul className="space-y-2.5" role="list">
          {data.map((friend) => (
            <FriendListItem key={friend.id} friend={friend} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendsList;
