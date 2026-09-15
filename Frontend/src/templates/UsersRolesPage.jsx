import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import UsersRolesContainer from "@/components/table/users-roles/UsersRolesContainer";
import UserDetailSheet from "@/components/users-roles/UserDetailSheet";
import { usersRolesStats } from "@/dummyData/usersRoles";

export default function UsersRolesPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <SimpleStatsRow stats={usersRolesStats} />
        <UsersRolesContainer />
      </div>
      <UserDetailSheet />
    </>
  );
}
