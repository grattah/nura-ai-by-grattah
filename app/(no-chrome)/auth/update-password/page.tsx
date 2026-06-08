import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center px-6 md:px-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
