export const STATUS_LABEL: Record<string, [string, "gray" | "green" | "red" | "amber" | "blue"]> = {
  pending_payment: ["Da pagare", "amber"],
  booked: ["Confermato", "green"],
  completed: ["Svolto", "gray"],
  no_show_user: ["Assenza", "red"],
  cancelled_late: ["Annullato in ritardo", "red"],
  cancelled: ["Annullato", "gray"],
  cancelled_by_specialist: ["Annullato dallo specialista", "gray"],
};
