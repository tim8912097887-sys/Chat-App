import AccountDropdown from "./AccountDropdown";
import RelationshipHeaderLogo from "./RelationshipHeaderLogo";

const RelationshipHeader = () => {
  return (
    <header className="flex items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
      <RelationshipHeaderLogo />
      <AccountDropdown />
    </header>
  );
};

export default RelationshipHeader;
