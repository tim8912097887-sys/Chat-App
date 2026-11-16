import { useState } from "react";
import Avatar from "../../../common/components/avatar/Avatar";
import RetrySection from "../../../common/components/retry/RetrySection";
import useGetProfile from "../hooks/useGetProfile";
import ProfilePageSkeleton from "./ProfilePageSkeleton";
import { Link } from "react-router";

const ProfilePage = () => {
  const { data: user, error, loading, retry } = useGetProfile();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!user?.searchCode) return;

    try {
      await navigator.clipboard.writeText(user.searchCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!user && loading) {
    return <ProfilePageSkeleton />;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F4F5F8] p-4 sm:p-8">
        {error ? (
          <RetrySection message={error} onRetry={retry} retrying={loading} />
        ) : (
          <p role="status" className="text-sm text-slate-500">
            Loading profile...
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F5F8] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Back to Relationship Home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm
            font-medium text-slate-500 hover:text-indigo-600
            transition-colors"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Friends
        </Link>

        <div
          className="bg-white rounded-3xl border
          border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8"
        >
          {/* Header */}
          <div className="pb-6 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

            <p className="text-sm text-slate-500 mt-1">
              Manage your personal information and friend discovery.
            </p>
          </div>

          {/* Personal Information */}
          <section className="space-y-5">
            <h2 className="font-semibold text-slate-800">
              Personal Information
            </h2>

            <div className="flex items-center gap-4">
              <Avatar
                imageUrl={user.imageUrl}
                size="w-16 h-16"
                bgColor="bg-indigo-50"
                textColor="text-indigo-600"
              />

              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {user.name}
                </p>

                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Display Name
              </label>

              <div
                className="px-4 py-3 rounded-xl bg-slate-50
                border border-slate-200 text-sm text-slate-700"
              >
                {user.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Email Address
              </label>

              <div
                className="px-4 py-3 rounded-xl bg-slate-50
                border border-slate-200 text-sm text-slate-700"
              >
                {user.email}
              </div>
            </div>
          </section>

          {/* Search Code */}
          <section className="pt-6 border-t border-slate-100 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-800">My Search Code</h2>

              <p className="text-sm text-slate-500 mt-1">
                Share this code with others so they can find and add you.
              </p>
            </div>

            <div
              className="rounded-2xl bg-indigo-50/70
              border border-indigo-100 p-5 space-y-4"
            >
              <p className="text-xs font-medium text-indigo-600">
                YOUR FRIEND DISCOVERY CODE
              </p>

              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-2xl sm:text-3xl font-bold
                  tracking-[0.15em] font-mono text-slate-900"
                >
                  {user.searchCode}
                </span>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="shrink-0 px-4 py-2.5 rounded-xl
                    bg-indigo-600 text-white text-sm font-medium
                    hover:bg-indigo-700 transition"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Anyone with this code can search for your account.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
