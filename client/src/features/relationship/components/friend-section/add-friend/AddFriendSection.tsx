import { useState, type SubmitEvent } from "react";
import Avatar from "../../../../../common/components/avatar/Avatar";
import useSearchUser from "../../../../user/hooks/useSearchUser";
import RetrySection from "../../../../../common/components/retry/RetrySection";
import { Button } from "../../../../../common/components/button";
import UserNotFoundSection from "./UserNotFoundSection";

const AddFriendSection = () => {
  const [code, setCode] = useState("");
  const { searchUser, data, error, loading, hasSearch } = useSearchUser();

  const handleSearch = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    await searchUser(code);
  };

  return (
    <div className="space-y-4">
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
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        <h3>Add a friend</h3>
      </div>

      <p className="text-xs sm:text-sm text-slate-500">
        Enter their 8-character search code.
      </p>

      {/* Input + Action Button */}
      <form onSubmit={handleSearch} className="space-y-3">
        <label htmlFor="friend-code-input" className="sr-only">
          8-character search code
        </label>
        <input
          id="friend-code-input"
          type="text"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. A7BC2DEF"
          className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200/80 rounded-2xl uppercase tracking-wider font-mono placeholder:font-sans placeholder:normal-case placeholder:tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
        />

        <Button type="submit" loading={loading} fullWidth={true}>
          Find user
        </Button>
      </form>

      {error && (
        <RetrySection
          retrying={loading}
          onRetry={() => searchUser(code)}
          message={error}
        />
      )}
      {hasSearch && !error && data === null && <UserNotFoundSection />}
      {!error && data && (
        <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              imageUrl={data.imageUrl}
              size="w-10 h-10"
              bgColor="bg-emerald-50"
              textColor="text-emerald-600"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {data.name}
              </p>
            </div>
          </div>
          <Button type="button" size="sm">
            Send Request
          </Button>
        </div>
      )}
    </div>
  );
};

export default AddFriendSection;
