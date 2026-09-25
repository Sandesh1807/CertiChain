import { BadgeCheck, CircleHelp, ShieldX } from "lucide-react";
import { Badge } from "./ui";

const TONES = { VALID: "brand", REVOKED: "REVOKED", NOT_FOUND: "NOT_FOUND" };
const ICONS = {
  VALID: BadgeCheck,
  REVOKED: ShieldX,
  NOT_FOUND: CircleHelp,
};
const LABELS = {
  VALID: "Valid on-chain",
  REVOKED: "Revoked",
  NOT_FOUND: "Not found",
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const Icon = ICONS[status] || CircleHelp;
  return (
    <Badge tone={TONES[status] || "NOT_FOUND"} className="!px-3.5 !py-1.5 !text-sm">
      <Icon className="h-4 w-4" strokeWidth={2.4} />
      {LABELS[status] || status}
    </Badge>
  );
}
