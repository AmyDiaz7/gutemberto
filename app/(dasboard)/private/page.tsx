import { redirect } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/server";

export default async function PrivatePage() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();

  console.log(data, error);

  if (error || !data?.user) {
    redirect("/login");
  }

  return <p>Hello {data.user.email}</p>;
}
