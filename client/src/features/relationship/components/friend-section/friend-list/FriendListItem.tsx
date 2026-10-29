import Avatar from "../../../../../common/components/avatar/Avatar";
import type { FriendPhoto } from "../../../types";

type FriendListItemProps = {
  friend: FriendPhoto;
};

const FriendListItem = ({ friend }: FriendListItemProps) => {
  return (
    <li>
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-150 text-left group focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            imageUrl={friend.imageUrl}
            size="w-11 h-11"
            bgColor="bg-indigo-50"
            textColor="text-indigo-600"
          />

          {/* User info */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition">
              {friend.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${friend.isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                aria-hidden="true"
              />
              <span className="text-xs text-slate-400 capitalize">
                {friend.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Chevron Icon */}
        <svg
          className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </li>
  );
};

export default FriendListItem;
