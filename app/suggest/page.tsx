import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import SuggestPage from "@/components/SuggestPage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <>
      <Navbar username={user.username} />
      <SuggestPage />
    </>
  );
}
