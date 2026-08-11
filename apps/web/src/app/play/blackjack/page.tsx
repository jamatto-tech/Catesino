import { redirect } from "next/navigation";

/** Legacy path → BlackCate */
export default function BlackjackRedirectPage() {
  redirect("/play/blackcate");
}
