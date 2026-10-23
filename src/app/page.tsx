import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

export default async function HomePage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role === "ADMIN") {
    redirect("/admin");
  } else if (role === "MANAGER") {
    redirect("/manager");
  } else {
    redirect("/employee");
  }
}
