import * as z from "zod";

export const nexioValidation = z.object({
  nexio: z.string().min(1).min(3, { message: "Minimum 3 Characters" }),
  accountId: z.string()
});
export const commentValidation = z.object({
  nexio: z.string().min(1).min(3, { message: "Minimum 3 Characters" }),
});
