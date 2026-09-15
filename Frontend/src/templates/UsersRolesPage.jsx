import UsersRolesStats from "@/components/users-roles/UsersRolesStats";
import UsersRolesContainer from "@/components/table/users-roles/UsersRolesContainer";
import UserDetailSheet from "@/components/users-roles/UserDetailSheet";

export default function UsersRolesPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        {/* Both of these fetch their own data. Nothing is threaded down from
            here, so the page stays a layout and the data lives beside what
            renders it. */}
        <UsersRolesStats />
        <UsersRolesContainer />
      </div>
      <UserDetailSheet />
    </>
  );
}
