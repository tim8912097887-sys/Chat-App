import FriendsSection from "../components/friend-section/FriendsSection";
import RelationshipHeader from "../components/header/RelationshipHeader";

const RelationshipHomePage = () => {
  return (
    <main className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans text-slate-800">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-8 md:p-10 space-y-8">
        <RelationshipHeader />
        <FriendsSection />
      </div>
    </main>
  );
};

export default RelationshipHomePage;
