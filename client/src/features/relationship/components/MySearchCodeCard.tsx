import { useState } from "react";
import { useAuthStore } from "../../auth/store/store";

const MySearchCodeCard = () => {
  const user = useAuthStore((state) => state.user);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!user?.searchCode) return;

    try {
      await navigator.clipboard.writeText(user.searchCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!user?.searchCode) return null;

  return (
    <section
      className="rounded-2xl border border-indigo-100
      bg-indigo-50/60 p-4 sm:p-5"
    >
      <div
        className="flex flex-col sm:flex-row
        sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Let others find you!
          </p>

          <p className="text-xs text-slate-500">
            Share your Search Code with your friends.
          </p>

          <p
            className="text-lg font-bold font-mono tracking-widest
            text-indigo-700 pt-1"
          >
            {user.searchCode}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2.5 rounded-xl bg-indigo-600
            text-white text-sm font-medium hover:bg-indigo-700
            transition"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>
    </section>
  );
};

export default MySearchCodeCard;
