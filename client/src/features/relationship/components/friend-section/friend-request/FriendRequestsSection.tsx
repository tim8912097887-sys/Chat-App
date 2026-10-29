import { useState } from "react";
import Avatar from "../../../../../common/components/avatar/Avatar";
import { Button } from "../../../../../common/components/button";
import useGetFriendRequest from "../../../hooks/useGetFriendRequest";
import FriendRequestsSkeleton from "./FriendRequestsSkeleton";
import RetrySection from "../../../../../common/components/retry/RetrySection";
import FriendRequestsEmptySection from "./FriendRequestsEmptySection";

const FriendRequestsSection = () => {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const {
    data: incomingRequests,
    error: incomingRequestError,
    loading: incomingRequestLoading,
    retry: incomingRequestRetry,
  } = useGetFriendRequest({ direction: "incoming" });

  const {
    data: outgoingRequests,
    error: outgoingRequestError,
    loading: outgoingRequestLoading,
    retry: outgoingRequestRetry,
  } = useGetFriendRequest({ direction: "outgoing" });

  // Select active tab state
  const isSent = activeTab === "sent";
  const displayRequests = isSent ? outgoingRequests : incomingRequests;
  const displayError = isSent ? outgoingRequestError : incomingRequestError;
  const displayLoading = isSent
    ? outgoingRequestLoading
    : incomingRequestLoading;
  const displayRetry = isSent ? outgoingRequestRetry : incomingRequestRetry;

  // Determine UI conditions
  const isInitialLoading = displayLoading && displayRequests === null;
  const hasError = Boolean(displayError);
  const isEmpty =
    !isInitialLoading &&
    !hasError &&
    displayRequests !== null &&
    displayRequests.length === 0;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100">
      {/* Title */}
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
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3>Friend requests</h3>
      </div>

      {/* Tabs */}
      <nav
        aria-label="Friend request categories"
        className="flex items-center gap-2"
      >
        <Button
          type="button"
          onClick={() => setActiveTab("received")}
          unstyled
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition ${
            activeTab === "received"
              ? "bg-indigo-50 text-indigo-700 font-semibold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Received
        </Button>

        <Button
          type="button"
          onClick={() => setActiveTab("sent")}
          unstyled
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition ${
            activeTab === "sent"
              ? "bg-indigo-50 text-indigo-700 font-semibold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Sent
        </Button>
      </nav>

      {/* Content Area */}
      <div>
        {/* Initial Loading Skeleton */}
        {isInitialLoading && <FriendRequestsSkeleton count={3} />}

        {/* Error / Retry State */}
        {!isInitialLoading && hasError && (
          <RetrySection
            message={displayError!}
            onRetry={displayRetry}
            retrying={displayLoading}
          />
        )}

        {/* Empty State */}
        {isEmpty && <FriendRequestsEmptySection type={activeTab} />}

        {/* Requests List */}
        {!isInitialLoading &&
          !hasError &&
          displayRequests &&
          displayRequests.length > 0 && (
            <ul
              className={`space-y-2.5 transition-opacity ${
                displayLoading
                  ? "opacity-60 pointer-events-none"
                  : "opacity-100"
              }`}
              role="list"
            >
              {displayRequests.map((req) => (
                <li
                  key={req.requestId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60"
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      imageUrl={req.imageUrl}
                      size="w-10 h-10"
                      bgColor="bg-blue-50"
                      textColor="text-blue-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {req.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isSent ? "Pending confirmation" : "Request sent"}
                      </p>
                    </div>
                  </div>

                  {/* Pending badge / Actions */}
                  {isSent ? (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 shrink-0">
                      Pending
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        aria-label={`Accept ${req.name}`}
                        shape="pill"
                        size="sm"
                        variant="primary"
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        aria-label={`Reject ${req.name}`}
                        shape="pill"
                        size="sm"
                        variant="secondary"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
};

export default FriendRequestsSection;
