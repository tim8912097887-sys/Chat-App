import AddFriendSection from "./add-friend/AddFriendSection";
import FriendRequestsSection from "./friend-request/FriendRequestsSection";
import FriendsList from "./friend-list/FriendsList";

const FriendsSection = () => {
  return (
    <section aria-labelledby="friends-heading" className="space-y-6">
      {/* Title */}
      <div>
        <h2
          id="friends-heading"
          className="text-2xl font-bold text-slate-900 tracking-tight"
        >
          Friends
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Find people, manage requests, and see who's online.
        </p>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Your Friends */}
        <FriendsList />

        {/* Right Column: Add Friend & Friend Requests */}
        <div className="space-y-8">
          <AddFriendSection />
          <FriendRequestsSection />
        </div>
      </div>
    </section>
  );
};

export default FriendsSection;
