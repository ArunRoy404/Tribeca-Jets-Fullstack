"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Eye, EyeOff } from "lucide-react";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const roleOptions = ["Admin", "Senior Broker", "Broker", "Assistant"];

const EMPTY_FORM = {
  email: "",
  role: "Admin",
  password: "",
  message: "",
};

export default function InviteUserDialog() {
  const open = useUsersRolesStore((s) => s.inviteModalOpen);
  const close = useUsersRolesStore((s) => s.closeInviteModal);
  const editingUser = useUsersRolesStore((s) => s.editingUser);
  const inviteUser = useUsersRolesStore((s) => s.inviteUser);
  const updateUser = useUsersRolesStore((s) => s.updateUser);

  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open && editingUser) {
      setForm({
        email: editingUser.email || "",
        role: editingUser.role || "Admin",
        password: "••••••••••••",
        message: "",
      });
    } else if (open) {
      setForm(EMPTY_FORM);
    }
  }, [open, editingUser]);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, form);
    } else {
      inviteUser(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-4xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
            {editingUser ? "Edit User Role" : "Invite New User"}
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <FormField label="Email Address" labelClassName={LABEL_CLASS}>
            <Input
              className={FIELD_CLASS}
              placeholder="broker@gmail.com"
              type="email"
              value={form.email}
              onChange={(e) => setField("email")(e.target.value)}
            />
          </FormField>

          <FormField label="Role" labelClassName={LABEL_CLASS}>
            <PickerSelect
              value={form.role}
              onChange={setField("role")}
              options={roleOptions}
              placeholder="Select Role"
              className={FIELD_CLASS}
            />
          </FormField>

          <FormField label="Password" labelClassName={LABEL_CLASS}>
            <div className="relative w-full">
              <Input
                className={`${FIELD_CLASS} pr-10`}
                type={showPassword ? "text" : "password"}
                placeholder="************"
                value={form.password}
                onChange={(e) => setField("password")(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>

          <FormField label="Message (Optional)" labelClassName={LABEL_CLASS}>
            <Textarea
              className="rounded-sm text-base font-medium min-h-24"
              placeholder="Type..."
              value={form.message}
              onChange={(e) => setField("message")(e.target.value)}
            />
          </FormField>

          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4">
              <Pencil className="size-4" />
              {editingUser ? "Save Changes" : "Invite New User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
