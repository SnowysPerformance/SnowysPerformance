import Link from "next/link";

// "Sign in | Register" switcher shown at the top of the login and register
// pages.
export default function AuthTabs({ active }: { active: "login" | "register" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={
        "flex-1 text-center pb-2 text-sm font-medium border-b-2 transition-colors " +
        (on ? "border-accent text-primary" : "border-transparent text-faint hover:text-muted")
      }
    >
      {label}
    </Link>
  );
  return (
    <div className="flex border-b border-edgesoft">
      {tab("/login", "Sign in", active === "login")}
      {tab("/register", "Register", active === "register")}
    </div>
  );
}
