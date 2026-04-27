import {
  Mic,
  Radio,
  Video,
  Users,
  GraduationCap,
  Calendar,
  Wifi,
  Coffee,
  Printer,
  Accessibility,
  Sparkles,
  Heart,
  Network,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Mic,
  Radio,
  Video,
  Users,
  GraduationCap,
  Calendar,
  Wifi,
  Coffee,
  Printer,
  Accessibility,
  Sparkles,
  Heart,
  Network,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
