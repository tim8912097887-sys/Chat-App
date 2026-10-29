type FriendRequestsEmptySectionProps = {
  type: "received" | "sent";
};

const FriendRequestsEmptySection = ({
  type,
}: FriendRequestsEmptySectionProps) => {
  const isReceived = type === "received";

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-slate-200/60 bg-slate-50/50 px-5 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {isReceived ? (
          /* User plus icon */
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        ) : (
          /* Paper airplane / Sent icon */
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-700">
          {isReceived ? "No friend requests" : "No sent requests"}
        </p>
        <p className="text-xs text-slate-400 max-w-60">
          {isReceived
            ? "When someone sends you a friend request, you'll see them here."
            : "Friend requests you've sent that are pending will appear here."}
        </p>
      </div>
    </div>
  );
};

export default FriendRequestsEmptySection;
